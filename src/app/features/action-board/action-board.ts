import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionBoardService } from '../../core/services/action-board.service';
import {
  LinearPriority,
  LinearStatus,
  LinearTargetApp
} from '../../core/models/action-board.model';

@Component({
  selector: 'app-action-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './action-board.html',
  styleUrl: './action-board.scss'
})
export class ActionBoardComponent {
  readonly actionService = inject(ActionBoardService);

  readonly issues = this.actionService.filteredIssues;
  readonly metrics = this.actionService.metrics;
  readonly selectedStatus = this.actionService.selectedStatus;
  readonly selectedProject = this.actionService.selectedProject;

  // New Issue Modal Form State
  isModalOpen = false;
  newTitle = '';
  newPriority: LinearPriority = 'high';
  newProject: LinearTargetApp = 'Market Engine POS';
  newAssignee = 'Robert Cuko';

  setStatusFilter(status: LinearStatus | 'all'): void {
    this.actionService.setStatusFilter(status);
  }

  setProjectFilter(project: LinearTargetApp | 'all'): void {
    this.actionService.setProjectFilter(project);
  }

  advanceStatus(id: string, currentStatus: LinearStatus): void {
    const sequence: Record<LinearStatus, LinearStatus> = {
      triage: 'todo',
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
      canceled: 'todo'
    };
    this.actionService.updateIssueStatus(id, sequence[currentStatus]);
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveIssue(): void {
    if (!this.newTitle.trim()) return;

    this.actionService.addIssue({
      title: this.newTitle.trim(),
      priority: this.newPriority,
      status: 'todo',
      project: this.newProject,
      assignee: this.newAssignee.trim() || 'Robert Cuko',
      source: 'manual'
    });

    this.resetForm();
    this.closeModal();
  }

  private resetForm(): void {
    this.newTitle = '';
    this.newPriority = 'high';
    this.newProject = 'Market Engine POS';
    this.newAssignee = 'Robert Cuko';
  }
}