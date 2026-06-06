package com.kindergarten.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "classes")
public class KindergartenClass {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String ageGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    private AppUser teacher;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAgeGroup() { return ageGroup; }
    public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }
    public AppUser getTeacher() { return teacher; }
    public void setTeacher(AppUser teacher) { this.teacher = teacher; }
}
