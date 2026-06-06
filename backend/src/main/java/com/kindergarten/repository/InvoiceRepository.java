package com.kindergarten.repository;

import com.kindergarten.domain.Invoice;
import com.kindergarten.domain.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.YearMonth;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByStudentIdOrderByBillingMonthDesc(Long studentId);
    List<Invoice> findByStudentParentsUserIdOrderByBillingMonthDesc(Long parentUserId);
    boolean existsByStudentIdAndBillingMonth(Long studentId, YearMonth billingMonth);
    boolean existsByStudentIdAndBillingDetailAndDueDate(Long studentId, String billingDetail, java.time.LocalDate dueDate);
    long countByStatus(InvoiceStatus status);
}
