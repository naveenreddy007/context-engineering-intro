// Event Management Task Hierarchy Pattern
// Demonstrates hierarchical task structure for Indian event management

class EventTaskHierarchy {
  constructor() {
    this.tasks = new Map();
    this.dependencies = new Map();
  }

  // Create task with hierarchy support
  createTask(taskData) {
    const task = {
      id: taskData.id,
      name: taskData.name,
      moduleId: taskData.moduleId,
      parentTaskId: taskData.parentTaskId || null,
      assignedTo: taskData.assignedTo,
      dueDate: taskData.dueDate,
      status: 'pending', // pending, in_progress, completed, blocked
      priority: taskData.priority || 'medium',
      estimatedHours: taskData.estimatedHours,
      actualHours: 0,
      dependencies: [],
      subtasks: [],
      metadata: taskData.metadata || {}
    };

    this.tasks.set(task.id, task);
    
    // Link to parent if exists
    if (task.parentTaskId) {
      const parent = this.tasks.get(task.parentTaskId);
      if (parent) {
        parent.subtasks.push(task.id);
      }
    }

    return task;
  }

  // Add dependency between tasks
  addDependency(taskId, dependsOnTaskId) {
    const task = this.tasks.get(taskId);
    const dependsOnTask = this.tasks.get(dependsOnTaskId);
    
    if (task && dependsOnTask) {
      task.dependencies.push(dependsOnTaskId);
      
      if (!this.dependencies.has(dependsOnTaskId)) {
        this.dependencies.set(dependsOnTaskId, []);
      }
      this.dependencies.get(dependsOnTaskId).push(taskId);
    }
  }

  // Check if task can be started (all dependencies completed)
  canStartTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  // Get task progress percentage including subtasks
  getTaskProgress(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return 0;

    if (task.subtasks.length === 0) {
      return task.status === 'completed' ? 100 : 0;
    }

    const subtaskProgress = task.subtasks.map(subtaskId => 
      this.getTaskProgress(subtaskId)
    );
    
    return subtaskProgress.reduce((sum, progress) => sum + progress, 0) / subtaskProgress.length;
  }

  // Get critical path for event completion
  getCriticalPath(eventId) {
    // Implementation for critical path analysis
    // Returns array of task IDs that determine event completion time
    const eventTasks = Array.from(this.tasks.values())
      .filter(task => task.metadata.eventId === eventId);
    
    // Simplified critical path - tasks with longest dependency chains
    return this.findLongestPath(eventTasks);
  }

  findLongestPath(tasks) {
    // Simplified implementation
    const visited = new Set();
    let longestPath = [];
    
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        const path = this.dfsLongestPath(task.id, visited, []);
        if (path.length > longestPath.length) {
          longestPath = path;
        }
      }
    });
    
    return longestPath;
  }

  dfsLongestPath(taskId, visited, currentPath) {
    visited.add(taskId);
    currentPath.push(taskId);
    
    const dependentTasks = this.dependencies.get(taskId) || [];
    let longestSubPath = [...currentPath];
    
    dependentTasks.forEach(depTaskId => {
      if (!visited.has(depTaskId)) {
        const subPath = this.dfsLongestPath(depTaskId, visited, [...currentPath]);
        if (subPath.length > longestSubPath.length) {
          longestSubPath = subPath;
        }
      }
    });
    
    return longestSubPath;
  }
}

// Example usage for Indian Wedding Event
const weddingTasks = new EventTaskHierarchy();

// Main modules
const decorationModule = 'decoration_001';
const foodModule = 'food_001';
const lightingModule = 'lighting_001';

// Decoration tasks
weddingTasks.createTask({
  id: 'dec_001',
  name: 'Stage Decoration Setup',
  moduleId: decorationModule,
  assignedTo: 'decorator_team_1',
  dueDate: '2024-01-15T08:00:00Z',
  priority: 'high',
  estimatedHours: 6,
  metadata: { eventId: 'wedding_001', venue: 'main_hall' }
});

weddingTasks.createTask({
  id: 'dec_002',
  name: 'Floral Arrangements',
  moduleId: decorationModule,
  parentTaskId: 'dec_001',
  assignedTo: 'florist_team',
  dueDate: '2024-01-15T10:00:00Z',
  estimatedHours: 3,
  metadata: { eventId: 'wedding_001', flowers: ['roses', 'marigolds', 'jasmine'] }
});

// Lighting tasks
weddingTasks.createTask({
  id: 'light_001',
  name: 'Stage Lighting Setup',
  moduleId: lightingModule,
  assignedTo: 'electrician_team',
  dueDate: '2024-01-15T06:00:00Z',
  priority: 'high',
  estimatedHours: 4,
  metadata: { eventId: 'wedding_001', equipment: ['led_panels', 'spot_lights'] }
});

// Food preparation
weddingTasks.createTask({
  id: 'food_001',
  name: 'Menu Preparation',
  moduleId: foodModule,
  assignedTo: 'head_chef',
  dueDate: '2024-01-15T12:00:00Z',
  estimatedHours: 8,
  metadata: { 
    eventId: 'wedding_001', 
    menu: ['biryani', 'dal', 'sabzi', 'raita', 'sweets'],
    guestCount: 500
  }
});

// Add dependencies
weddingTasks.addDependency('dec_002', 'light_001'); // Floral needs lighting first
weddingTasks.addDependency('dec_001', 'light_001'); // Stage decoration needs lighting

module.exports = { EventTaskHierarchy, weddingTasks };