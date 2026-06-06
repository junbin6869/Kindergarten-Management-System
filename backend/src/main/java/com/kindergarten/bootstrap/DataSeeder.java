package com.kindergarten.bootstrap;

import com.kindergarten.domain.*;
import com.kindergarten.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

@Component
@Profile("java-seed")
public class DataSeeder implements CommandLineRunner {
    private final AppUserRepository users;
    private final ClassRepository classes;
    private final ParentRepository parents;
    private final StudentRepository students;
    private final InvoiceRepository invoices;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(AppUserRepository users, ClassRepository classes, ParentRepository parents,
                      StudentRepository students, InvoiceRepository invoices, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.classes = classes;
        this.parents = parents;
        this.students = students;
        this.invoices = invoices;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (users.count() > 0) {
            return;
        }

        AppUser admin = user("admin@kindergarten.test", "Admin User", Role.ADMIN);
        AppUser teacher = user("teacher@kindergarten.test", "Ms Lim", Role.TEACHER);
        AppUser parentUser = user("parent@kindergarten.test", "Tan Wei Ming", Role.PARENT);
        users.save(admin);
        users.save(teacher);
        users.save(parentUser);

        KindergartenClass k2 = new KindergartenClass();
        k2.setName("K2 Daisy");
        k2.setAgeGroup("5 years old");
        k2.setTeacher(teacher);
        classes.save(k2);

        Parent parent = new Parent();
        parent.setFullName("Tan Wei Ming");
        parent.setPhone("+60123456789");
        parent.setEmail("parent@kindergarten.test");
        parent.setUser(parentUser);
        parents.save(parent);

        Student student = new Student();
        student.setFullName("Tan Jia En");
        student.setDateOfBirth(LocalDate.of(2021, 3, 18));
        student.setKindergartenClass(k2);
        student.getParents().add(parent);
        students.save(student);

        Invoice invoice = new Invoice();
        invoice.setStudent(student);
        invoice.setBillingMonth(YearMonth.now());
        invoice.setBillingDetail("Tuition fee");
        invoice.setAmount(new BigDecimal("650.00"));
        invoice.setDueDate(LocalDate.now().plusDays(10));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoices.save(invoice);
    }

    private AppUser user(String email, String fullName, Role role) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode("password"));
        return user;
    }
}
