package com.kindergarten.web;

import com.kindergarten.repository.AttendanceRepository;
import com.kindergarten.repository.InvoiceRepository;
import com.kindergarten.repository.StudentCommentRepository;
import com.kindergarten.repository.StudentRepository;
import com.kindergarten.service.PaymentService;
import com.kindergarten.web.dto.Dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/parent")
public class ParentController {
    private final StudentRepository students;
    private final AttendanceRepository attendance;
    private final InvoiceRepository invoices;
    private final StudentCommentRepository comments;
    private final PaymentService paymentService;

    public ParentController(StudentRepository students, AttendanceRepository attendance, InvoiceRepository invoices,
                            StudentCommentRepository comments, PaymentService paymentService) {
        this.students = students;
        this.attendance = attendance;
        this.invoices = invoices;
        this.comments = comments;
        this.paymentService = paymentService;
    }

    @GetMapping("/children")
    public List<StudentDto> children(Authentication authentication) {
        return students.findByParentUserId(CurrentUser.from(authentication).id()).stream().map(StudentDto::from).toList();
    }

    @GetMapping("/children/{studentId}")
    public StudentDetailDto child(@PathVariable Long studentId, Authentication authentication) {
        assertParentOwnsStudent(studentId, authentication);
        var student = students.findById(studentId).orElseThrow();
        return new StudentDetailDto(
            StudentDto.from(student),
            student.getParents().stream().map(ParentDto::from).toList(),
            attendance.findByStudentIdOrderByAttendanceDateDesc(studentId).stream().map(AttendanceDto::from).toList(),
            invoices.findByStudentIdOrderByBillingMonthDesc(studentId).stream().map(InvoiceDto::from).toList(),
            comments.findByStudentIdOrderByCreatedAtDesc(studentId).stream().map(CommentDto::from).toList()
        );
    }

    @GetMapping("/invoices")
    public List<InvoiceDto> invoices(Authentication authentication) {
        Long parentUserId = CurrentUser.from(authentication).id();
        paymentService.reconcilePendingPaymentsForParent(parentUserId);
        return invoices.findByStudentParentsUserIdOrderByBillingMonthDesc(parentUserId).stream().map(InvoiceDto::from).toList();
    }

    @PostMapping("/invoices/{invoiceId}/pay")
    public PaymentService.CheckoutResponse pay(@PathVariable Long invoiceId, Authentication authentication) {
        var invoice = invoices.findById(invoiceId).orElseThrow();
        assertParentOwnsStudent(invoice.getStudent().getId(), authentication);
        return paymentService.createCheckoutSession(invoiceId);
    }

    private void assertParentOwnsStudent(Long studentId, Authentication authentication) {
        Long parentUserId = CurrentUser.from(authentication).id();
        boolean owns = students.findByParentUserId(parentUserId).stream().anyMatch(student -> student.getId().equals(studentId));
        if (!owns) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is not linked to this parent");
        }
    }
}
