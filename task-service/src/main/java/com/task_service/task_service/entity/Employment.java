package com.task_service.task_service.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Data
@Entity
@Table
@NoArgsConstructor
@ToString(exclude = {"employee", "unit"})
public class Employment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn
    @JsonManagedReference
    private Employee employee;

    @Column(nullable = false)
    private LocalDateTime joinTime;

    @Column
    private Boolean isDeleted;

    @ManyToOne
    @JoinColumn
    @JsonManagedReference
    private Role role;

    @ManyToOne
    @JoinColumn(nullable = false)
    @JsonManagedReference
    private Unit unit;

}
