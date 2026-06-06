package com.kindergarten.service;

import com.kindergarten.domain.Invoice;
import com.kindergarten.domain.InvoiceStatus;
import com.kindergarten.domain.Payment;
import com.kindergarten.repository.InvoiceRepository;
import com.kindergarten.repository.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
public class PaymentService {
    private final InvoiceRepository invoices;
    private final PaymentRepository payments;
    private final String stripeSecretKey;
    private final String successUrl;
    private final String cancelUrl;

    public PaymentService(InvoiceRepository invoices, PaymentRepository payments,
                          @Value("${app.stripe-secret-key}") String stripeSecretKey,
                          @Value("${app.frontend-success-url}") String successUrl,
                          @Value("${app.frontend-cancel-url}") String cancelUrl) {
        this.invoices = invoices;
        this.payments = payments;
        this.stripeSecretKey = stripeSecretKey;
        this.successUrl = successUrl;
        this.cancelUrl = cancelUrl;
    }

    @Transactional
    public CheckoutResponse createCheckoutSession(Long invoiceId) {
        Invoice invoice = invoices.findById(invoiceId).orElseThrow();
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice is already paid");
        }
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Stripe is not configured on the backend");
        }

        try {
            Stripe.apiKey = stripeSecretKey;
            long cents = invoice.getAmount().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .putMetadata("invoiceId", invoice.getId().toString())
                .addLineItem(SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency("myr")
                        .setUnitAmount(cents)
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName(invoice.getBillingDetail() == null || invoice.getBillingDetail().isBlank() ? "Kindergarten Fee - " + invoice.getBillingMonth() : invoice.getBillingDetail())
                            .build())
                        .build())
                    .build())
                .build();
            Session session = Session.create(params);
            Payment payment = new Payment();
            payment.setInvoice(invoice);
            payment.setStripeSessionId(session.getId());
            payment.setAmount(invoice.getAmount());
            payment.setStatus(InvoiceStatus.PENDING);
            payments.save(payment);
            return new CheckoutResponse(session.getId(), session.getUrl(), false);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not create Stripe Checkout session", ex);
        }
    }

    @Transactional
    public void markPaidBySession(String sessionId, Long invoiceId) {
        Invoice invoice = invoices.findById(invoiceId).orElseThrow();
        Payment payment = payments.findByStripeSessionId(sessionId).orElseGet(Payment::new);
        if (payment.getId() != null && payment.getStatus() == InvoiceStatus.PAID && invoice.getStatus() == InvoiceStatus.PAID) {
            return;
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoices.save(invoice);

        payment.setInvoice(invoice);
        payment.setStripeSessionId(sessionId);
        payment.setAmount(invoice.getAmount());
        payment.setStatus(InvoiceStatus.PAID);
        if (payment.getPaidAt() == null) {
            payment.setPaidAt(Instant.now());
        }
        payments.save(payment);
    }

    @Transactional
    public void markFailedBySession(String sessionId) {
        payments.findByStripeSessionId(sessionId).ifPresent(payment -> {
            if (payment.getStatus() == InvoiceStatus.PAID) {
                return;
            }
            payment.setStatus(InvoiceStatus.FAILED);
            payments.save(payment);
        });
    }

    @Transactional
    public void reconcilePendingPaymentsForParent(Long parentUserId) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            return;
        }
        Stripe.apiKey = stripeSecretKey;
        List<Payment> pendingPayments = payments.findByInvoiceStudentParentsUserIdAndStatus(parentUserId, InvoiceStatus.PENDING);
        for (Payment payment : pendingPayments) {
            try {
                Session session = Session.retrieve(payment.getStripeSessionId());
                if ("paid".equals(session.getPaymentStatus())) {
                    markPaidBySession(session.getId(), payment.getInvoice().getId());
                }
            } catch (Exception ignored) {
                // A missed reconciliation can be retried on the next invoice refresh.
            }
        }
    }

    public record CheckoutResponse(String sessionId, String checkoutUrl, boolean mock) {}
}
