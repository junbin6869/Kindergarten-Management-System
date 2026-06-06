package com.kindergarten.web;

import com.kindergarten.service.PaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/payments")
public class PaymentWebhookController {
    private final PaymentService paymentService;
    private final String webhookSecret;

    public PaymentWebhookController(PaymentService paymentService, @Value("${app.stripe-webhook-secret}") String webhookSecret) {
        this.paymentService = paymentService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/webhook")
    public void webhook(@RequestBody String payload, @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe webhook secret is not configured");
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, webhookSecret);
        } catch (SignatureVerificationException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe signature");
        }

        if ("checkout.session.completed".equals(event.getType())) {
            Session session = (Session) event.getDataObjectDeserializer().getObject()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing session object"));
            if (!"paid".equals(session.getPaymentStatus())) {
                return;
            }
            if (session.getMetadata() == null || !session.getMetadata().containsKey("invoiceId")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing invoice metadata");
            }
            Long invoiceId = Long.valueOf(session.getMetadata().get("invoiceId"));
            paymentService.markPaidBySession(session.getId(), invoiceId);
        }
        if ("checkout.session.expired".equals(event.getType())) {
            Session session = (Session) event.getDataObjectDeserializer().getObject()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing session object"));
            paymentService.markFailedBySession(session.getId());
        }
    }
}
