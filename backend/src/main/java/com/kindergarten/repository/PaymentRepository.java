package com.kindergarten.repository;

import com.kindergarten.domain.Payment;
import com.kindergarten.domain.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByStripeSessionId(String stripeSessionId);
    List<Payment> findByInvoiceStudentParentsUserIdAndStatus(Long parentUserId, InvoiceStatus status);
}
