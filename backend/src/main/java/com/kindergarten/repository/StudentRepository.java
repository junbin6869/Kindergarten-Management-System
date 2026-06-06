package com.kindergarten.repository;

import com.kindergarten.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByKindergartenClassId(Long classId);

    List<Student> findByKindergartenClassIsNull();

    @Query("""
        select distinct s from Student s
        join s.parents p
        where p.user.id = :userId
    """)
    List<Student> findByParentUserId(@Param("userId") Long userId);

    @Query("""
        select s from Student s
        where lower(s.fullName) like lower(concat('%', :query, '%'))
        and (:classId is null or s.kindergartenClass.id = :classId)
    """)
    List<Student> search(@Param("query") String query, @Param("classId") Long classId);
}
