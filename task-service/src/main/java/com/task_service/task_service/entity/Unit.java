package com.task_service.task_service.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.task_service.task_service.dto.LTreeType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table
@NoArgsConstructor
public class Unit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String unitCode;

    @Column(nullable = false)
    private String unitName;

    @Column(nullable = false)
    private LocalDateTime createTime;

    @Column
    private LocalDateTime updateTime;

    @Column
    private String bossTitle;

    @Column
    private Boolean isDeleted;

    @ManyToOne
    @JoinColumn(nullable = false)
    @JsonManagedReference
    private Employee boss;

    @ManyToOne
    @JoinColumn(nullable = false)
    private Organization organization;

    @OneToMany(mappedBy = "unit", fetch = FetchType.EAGER)
    @JsonBackReference
    private List<Employment> employees;

    @Type(LTreeType.class)
    @Column(columnDefinition = "ltree")
    private String unitPath;

}
