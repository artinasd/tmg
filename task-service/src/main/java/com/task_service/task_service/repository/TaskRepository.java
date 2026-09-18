package com.task_service.task_service.repository;

import com.task_service.task_service.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    Task findByTaskCode(String taskCode);

    @Query(value = " SELECT * FROM task WHERE parentTask = :parentTask AND taskCode != :exclude", nativeQuery = true)
    List<Task> findSiblingsByParentTask(@Param("parentTask") String parentTask, @Param("taskCode") String exclude);

    @Query(value = """ 
            SELECT t.* FROM task t
                        JOIN employment e on t.responsible_id = e.id\s
                        join employee emp on e.employee_id = emp.id\s
                        join account a on emp.account_id = a.id\s
                        join task_status ts on t.task_status_id = ts.id\s
                        join task_status_type tst on ts.task_status_type_id = tst.id\s
                        where a.account_code = :accountCode and tst."type" = :type
            """, nativeQuery = true)
    List<Task> findAccountsTasks(@Param("accountCode") String accountCode, @Param("type") String status);
}