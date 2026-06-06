package com.kindergarten.web;

import com.kindergarten.domain.*;
import com.kindergarten.repository.*;
import com.kindergarten.web.dto.Dto.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AppUserRepository users;
    private final ClassRepository classes;
    private final StudentRepository students;
    private final ParentRepository parents;
    private final AttendanceRepository attendance;
    private final InvoiceRepository invoices;
    private final StudentCommentRepository comments;
    private final PasswordEncoder passwordEncoder;

    public AdminController(AppUserRepository users, ClassRepository classes, StudentRepository students,
                           ParentRepository parents, AttendanceRepository attendance, InvoiceRepository invoices,
                           StudentCommentRepository comments, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.classes = classes;
        this.students = students;
        this.parents = parents;
        this.attendance = attendance;
        this.invoices = invoices;
        this.comments = comments;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/dashboard")
    public Dashboard dashboard() {
        return new Dashboard(students.count(), classes.count(), invoices.countByStatus(InvoiceStatus.PENDING), invoices.countByStatus(InvoiceStatus.PAID));
    }

    @GetMapping("/users")
    public List<UserDto> users(@RequestParam(required = false) Role role) {
        return (role == null ? users.findAll() : users.findByRole(role)).stream().map(UserDto::from).toList();
    }

    @PostMapping("/users")
    public UserDto createUser(@Valid @RequestBody UserRequest request) {
        if (users.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        AppUser user = new AppUser();
        user.setEmail(request.email());
        user.setFullName(request.fullName());
        user.setRole(request.role());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        return UserDto.from(users.save(user));
    }

    @GetMapping("/classes")
    public List<ClassDto> classes() {
        return classes.findAll().stream().map(ClassDto::from).toList();
    }

    @GetMapping("/classes/{id}")
    public ClassDetailDto classDetail(@PathVariable Long id) {
        KindergartenClass item = classes.findById(id).orElseThrow();
        return new ClassDetailDto(
            ClassDto.from(item),
            students.findByKindergartenClassId(id).stream().map(StudentDto::from).toList()
        );
    }

    @PostMapping("/classes")
    public ClassDto createClass(@Valid @RequestBody ClassRequest request) {
        KindergartenClass item = new KindergartenClass();
        item.setName(request.name());
        item.setAgeGroup(request.ageGroup());
        item.setTeacher(request.teacherId() == null ? null : users.findById(request.teacherId()).orElseThrow());
        KindergartenClass saved = classes.save(item);
        if (request.studentIds() != null && !request.studentIds().isEmpty()) {
            students.findAllById(request.studentIds()).forEach(student -> {
                student.setKindergartenClass(saved);
                students.save(student);
            });
        }
        return ClassDto.from(saved);
    }

    @PutMapping("/classes/{id}/students")
    public ClassDetailDto updateClassStudents(@PathVariable Long id, @RequestBody ClassStudentsRequest request) {
        KindergartenClass item = classes.findById(id).orElseThrow();
        Set<Long> selectedIds = request.studentIds() == null ? Set.of() : request.studentIds();
        students.findByKindergartenClassId(id).forEach(student -> {
            if (!selectedIds.contains(student.getId())) {
                student.setKindergartenClass(null);
                students.save(student);
            }
        });
        students.findAllById(selectedIds).forEach(student -> {
            student.setKindergartenClass(item);
            students.save(student);
        });
        return classDetail(id);
    }

    @DeleteMapping("/classes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClass(@PathVariable Long id) {
        KindergartenClass item = classes.findById(id).orElseThrow();
        students.findByKindergartenClassId(id).forEach(student -> {
            student.setKindergartenClass(null);
            students.save(student);
        });
        classes.delete(item);
    }

    @GetMapping("/students")
    public List<StudentDto> students(@RequestParam(defaultValue = "") String query, @RequestParam(required = false) Long classId) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate start = currentMonth.atDay(1);
        LocalDate end = currentMonth.atEndOfMonth();
        return students.search(query, classId).stream()
            .map(student -> StudentDto.from(student, attendance.countByStudentIdAndStatusAndAttendanceDateBetween(student.getId(), AttendanceStatus.ABSENT, start, end)))
            .toList();
    }

    @PostMapping("/students")
    public StudentDto createStudent(@Valid @RequestBody StudentRequest request) {
        Student student = new Student();
        applyStudent(student, request);
        return StudentDto.from(students.save(student));
    }

    @GetMapping("/students/{id}")
    public StudentDetailDto student(@PathVariable Long id) {
        Student student = students.findById(id).orElseThrow();
        return new StudentDetailDto(
            StudentDto.from(student),
            student.getParents().stream().map(ParentDto::from).toList(),
            attendance.findByStudentIdOrderByAttendanceDateDesc(id).stream().map(AttendanceDto::from).toList(),
            invoices.findByStudentIdOrderByBillingMonthDesc(id).stream().map(InvoiceDto::from).toList(),
            comments.findByStudentIdOrderByCreatedAtDesc(id).stream().map(CommentDto::from).toList()
        );
    }

    @PutMapping("/students/{id}")
    public StudentDto updateStudent(@PathVariable Long id, @Valid @RequestBody StudentRequest request) {
        Student student = students.findById(id).orElseThrow();
        applyStudent(student, request);
        return StudentDto.from(students.save(student));
    }

    @PostMapping("/students/{id}/parents")
    public StudentDetailDto addParent(@PathVariable Long id, @Valid @RequestBody ParentRequest request) {
        Student student = students.findById(id).orElseThrow();
        Parent parent = new Parent();
        parent.setFullName(request.fullName());
        parent.setPhone(request.phone());
        parent.setEmail(request.email());
        if (request.userId() != null) {
            parent.setUser(users.findById(request.userId()).orElseThrow());
        }
        parents.save(parent);
        student.getParents().add(parent);
        students.save(student);
        return student(id);
    }

    @GetMapping("/attendance")
    public List<AttendanceDto> attendance(@RequestParam Long classId, @RequestParam LocalDate date) {
        return attendance.findByStudentKindergartenClassIdAndAttendanceDate(classId, date).stream().map(AttendanceDto::from).toList();
    }

    @PostMapping("/attendance")
    public AttendanceDto markAttendance(@Valid @RequestBody AttendanceRequest request) {
        Student student = students.findById(request.studentId()).orElseThrow();
        AttendanceRecord record = attendance.findByStudentIdAndAttendanceDate(request.studentId(), request.attendanceDate()).orElseGet(AttendanceRecord::new);
        record.setStudent(student);
        record.setAttendanceDate(request.attendanceDate());
        record.setStatus(request.status());
        record.setCheckInTime(request.checkInTime());
        record.setRemark(request.remark());
        return AttendanceDto.from(attendance.save(record));
    }

    @GetMapping("/invoices")
    public List<InvoiceDto> invoices() {
        return invoices.findAll().stream().map(InvoiceDto::from).toList();
    }

    @PostMapping("/invoices/generate")
    public List<InvoiceDto> generateInvoices(@Valid @RequestBody GenerateInvoicesRequest request) {
        List<Student> targets = request.classId() == null ? students.findAll() : students.findByKindergartenClassId(request.classId());
        YearMonth month = YearMonth.from(request.dueDate());
        return targets.stream()
            .filter(student -> !invoices.existsByStudentIdAndBillingDetailAndDueDate(student.getId(), request.billingDetail(), request.dueDate()))
            .map(student -> {
                Invoice invoice = new Invoice();
                invoice.setStudent(student);
                invoice.setBillingMonth(month);
                invoice.setBillingDetail(request.billingDetail());
                invoice.setAmount(request.amount());
                invoice.setDueDate(request.dueDate());
                invoice.setStatus(InvoiceStatus.PENDING);
                return InvoiceDto.from(invoices.save(invoice));
            })
            .toList();
    }

    @DeleteMapping("/invoices/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInvoice(@PathVariable Long id) {
        Invoice invoice = invoices.findById(id).orElseThrow();
        invoices.delete(invoice);
    }

    private void applyStudent(Student student, StudentRequest request) {
        student.setFullName(request.fullName());
        student.setDateOfBirth(request.dateOfBirth());
        student.setStatus(request.status());
        student.setKindergartenClass(request.classId() == null ? null : classes.findById(request.classId()).orElseThrow());
        if (request.parentIds() != null) {
            student.setParents(Set.copyOf(parents.findAllById(request.parentIds())));
        }
    }

    public record Dashboard(long students, long classes, long pendingInvoices, long paidInvoices) {}
    public record UserRequest(@Email String email, @NotBlank String fullName, @NotBlank String password, @NotNull Role role) {}
    public record ClassRequest(@NotBlank String name, @NotBlank String ageGroup, Long teacherId, Set<Long> studentIds) {}
    public record ClassStudentsRequest(Set<Long> studentIds) {}
    public record StudentRequest(@NotBlank String fullName, LocalDate dateOfBirth, @NotNull StudentStatus status, Long classId, Set<Long> parentIds) {}
    public record ParentRequest(@NotBlank String fullName, @NotBlank String phone, @Email String email, Long userId) {}
    public record AttendanceRequest(@NotNull Long studentId, @NotNull LocalDate attendanceDate, @NotNull AttendanceStatus status, java.time.LocalTime checkInTime, String remark) {}
    public record GenerateInvoicesRequest(@NotBlank String billingDetail, @NotNull @DecimalMin("1.00") BigDecimal amount, @NotNull LocalDate dueDate, Long classId) {}
}
