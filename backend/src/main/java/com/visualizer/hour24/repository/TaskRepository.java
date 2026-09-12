package com.visualizer.hour24.repository;

import com.visualizer.hour24.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByUserId(Long userId);

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    /**
     * Query for tasks overlapping a target 24-hour interval [rangeStart, rangeEnd).
     * Correctly handles tasks that cross midnight.
     */
    @Query("SELECT t FROM Task t WHERE t.user.id = :userId " +
           "AND t.startDateTime < :rangeEnd " +
           "AND t.endDateTime > :rangeStart " +
           "ORDER BY t.startDateTime ASC")
    List<Task> findTasksInDateRange(@Param("userId") Long userId,
                                   @Param("rangeStart") Instant rangeStart,
                                   @Param("rangeEnd") Instant rangeEnd);

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId " +
           "AND (:excludeTaskId IS NULL OR t.id <> :excludeTaskId) " +
           "AND t.startDateTime < :endDateTime " +
           "AND t.endDateTime > :startDateTime " +
           "ORDER BY t.startDateTime ASC")
    List<Task> findOverlappingTasks(@Param("userId") Long userId,
                                    @Param("startDateTime") Instant startDateTime,
                                    @Param("endDateTime") Instant endDateTime,
                                    @Param("excludeTaskId") Long excludeTaskId);
}
