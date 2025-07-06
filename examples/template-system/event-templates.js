// Event Template System for Indian Functions
// Demonstrates dynamic module loading and template management

class EventTemplateSystem {
  constructor() {
    this.templates = new Map();
    this.moduleCategories = new Map();
    this.initializeDefaultTemplates();
  }

  initializeDefaultTemplates() {
    // Marriage Template
    this.createTemplate({
      id: 'marriage_template',
      name: 'Traditional Indian Marriage',
      description: 'Complete wedding ceremony with all traditional elements',
      region: 'andhra_pradesh',
      defaultModules: [
        {
          category: 'venue',
          name: 'Venue Management',
          priority: 1,
          required: true,
          defaultTasks: [
            'Book marriage hall',
            'Arrange seating (500+ guests)',
            'Setup mandap area',
            'Parking arrangements'
          ]
        },
        {
          category: 'food',
          name: 'Catering Services',
          priority: 2,
          required: true,
          defaultTasks: [
            'Vegetarian menu planning',
            'Non-vegetarian menu planning',
            'Sweet preparations',
            'Breakfast arrangements',
            'Lunch buffet setup'
          ],
          metadata: {
            traditionalItems: ['biryani', 'pulihora', 'rasam', 'payasam'],
            servingStyle: 'buffet',
            estimatedGuests: 500
          }
        },
        {
          category: 'decoration',
          name: 'Decoration & Ambiance',
          priority: 3,
          required: true,
          defaultTasks: [
            'Stage decoration with flowers',
            'Entrance gate decoration',
            'Mandap decoration',
            'Guest seating area decoration',
            'Photo booth setup'
          ],
          metadata: {
            flowers: ['marigolds', 'roses', 'jasmine', 'lotus'],
            colors: ['red', 'yellow', 'orange', 'white'],
            style: 'traditional_south_indian'
          }
        },
        {
          category: 'lighting',
          name: 'Lighting & Sound',
          priority: 4,
          required: true,
          defaultTasks: [
            'Stage lighting setup',
            'Ambient lighting',
            'Sound system installation',
            'Microphone arrangements',
            'Music playlist preparation'
          ]
        },
        {
          category: 'photography',
          name: 'Photography & Videography',
          priority: 5,
          required: false,
          defaultTasks: [
            'Pre-wedding photoshoot',
            'Ceremony photography',
            'Candid photography',
            'Videography',
            'Drone photography'
          ]
        },
        {
          category: 'transportation',
          name: 'Transportation & Logistics',
          priority: 6,
          required: false,
          defaultTasks: [
            'Groom transportation (decorated car)',
            'Guest transportation',
            'Equipment transportation',
            'Vendor coordination'
          ]
        },
        {
          category: 'communications',
          name: 'Invitations & Communications',
          priority: 7,
          required: true,
          defaultTasks: [
            'Wedding invitation design',
            'Digital invitations',
            'Guest list management',
            'RSVP tracking',
            'Reminder notifications'
          ]
        },
        {
          category: 'gifts',
          name: 'Gifts & Favors',
          priority: 8,
          required: false,
          defaultTasks: [
            'Return gift selection',
            'Gift wrapping',
            'Distribution planning'
          ]
        }
      ]
    });

    // Birthday Template
    this.createTemplate({
      id: 'birthday_template',
      name: 'Birthday Celebration',
      description: 'Birthday party with customizable themes',
      region: 'general',
      defaultModules: [
        {
          category: 'venue',
          name: 'Venue Setup',
          priority: 1,
          required: true,
          defaultTasks: [
            'Book party venue',
            'Seating arrangements',
            'Stage/performance area'
          ]
        },
        {
          category: 'decoration',
          name: 'Theme Decoration',
          priority: 2,
          required: true,
          defaultTasks: [
            'Theme-based decoration',
            'Balloon arrangements',
            'Banner and signage',
            'Photo backdrop'
          ],
          metadata: {
            themes: ['cartoon', 'superhero', 'princess', 'sports', 'bollywood'],
            ageGroups: ['kids', 'teens', 'adults']
          }
        },
        {
          category: 'food',
          name: 'Food & Cake',
          priority: 3,
          required: true,
          defaultTasks: [
            'Birthday cake ordering',
            'Snacks and appetizers',
            'Beverages',
            'Special dietary requirements'
          ]
        },
        {
          category: 'entertainment',
          name: 'Entertainment',
          priority: 4,
          required: false,
          defaultTasks: [
            'DJ/Music arrangements',
            'Games and activities',
            'Magic show/entertainment',
            'Dance performances'
          ]
        }
      ]
    });

    // Corporate Event Template
    this.createTemplate({
      id: 'corporate_template',
      name: 'Corporate Event',
      description: 'Professional corporate events and conferences',
      region: 'general',
      defaultModules: [
        {
          category: 'venue',
          name: 'Conference Venue',
          priority: 1,
          required: true,
          defaultTasks: [
            'Conference hall booking',
            'AV equipment setup',
            'Registration desk setup',
            'Networking area arrangement'
          ]
        },
        {
          category: 'technology',
          name: 'Technology & AV',
          priority: 2,
          required: true,
          defaultTasks: [
            'Projector and screen setup',
            'Microphone systems',
            'Live streaming setup',
            'WiFi arrangements',
            'Technical support'
          ]
        },
        {
          category: 'catering',
          name: 'Corporate Catering',
          priority: 3,
          required: true,
          defaultTasks: [
            'Welcome refreshments',
            'Lunch arrangements',
            'Coffee breaks',
            'Networking dinner'
          ]
        },
        {
          category: 'materials',
          name: 'Event Materials',
          priority: 4,
          required: true,
          defaultTasks: [
            'Welcome kits preparation',
            'Brochures and materials',
            'Name badges',
            'Signage and banners'
          ]
        }
      ]
    });
  }

  createTemplate(templateData) {
    const template = {
      id: templateData.id,
      name: templateData.name,
      description: templateData.description,
      region: templateData.region,
      defaultModules: templateData.defaultModules,
      createdAt: new Date(),
      isCustom: templateData.isCustom || false
    };

    this.templates.set(template.id, template);
    return template;
  }

  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  getTemplatesByRegion(region) {
    return Array.from(this.templates.values())
      .filter(template => template.region === region || template.region === 'general');
  }

  // Clone template for customization
  cloneTemplate(templateId, newName, customizations = {}) {
    const originalTemplate = this.templates.get(templateId);
    if (!originalTemplate) {
      throw new Error(`Template ${templateId} not found`);
    }

    const clonedTemplate = {
      ...originalTemplate,
      id: `custom_${Date.now()}`,
      name: newName,
      isCustom: true,
      parentTemplateId: templateId,
      customizations,
      createdAt: new Date()
    };

    // Apply customizations
    if (customizations.additionalModules) {
      clonedTemplate.defaultModules.push(...customizations.additionalModules);
    }

    if (customizations.removeModules) {
      clonedTemplate.defaultModules = clonedTemplate.defaultModules
        .filter(module => !customizations.removeModules.includes(module.category));
    }

    if (customizations.modifyModules) {
      clonedTemplate.defaultModules = clonedTemplate.defaultModules.map(module => {
        const modification = customizations.modifyModules[module.category];
        return modification ? { ...module, ...modification } : module;
      });
    }

    this.templates.set(clonedTemplate.id, clonedTemplate);
    return clonedTemplate;
  }

  // Generate event from template
  generateEventFromTemplate(templateId, eventData) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const event = {
      id: eventData.id,
      name: eventData.name,
      date: eventData.date,
      templateId: templateId,
      clientId: eventData.clientId,
      venue: eventData.venue,
      estimatedGuests: eventData.estimatedGuests,
      budget: eventData.budget,
      status: 'planning',
      modules: [],
      createdAt: new Date()
    };

    // Generate modules from template
    template.defaultModules.forEach((moduleTemplate, index) => {
      const module = {
        id: `${event.id}_module_${index + 1}`,
        eventId: event.id,
        category: moduleTemplate.category,
        name: moduleTemplate.name,
        priority: moduleTemplate.priority,
        required: moduleTemplate.required,
        status: 'pending',
        tasks: [],
        metadata: moduleTemplate.metadata || {}
      };

      // Generate tasks from template
      moduleTemplate.defaultTasks.forEach((taskName, taskIndex) => {
        const task = {
          id: `${module.id}_task_${taskIndex + 1}`,
          moduleId: module.id,
          name: taskName,
          status: 'pending',
          assignedTo: null,
          dueDate: null,
          estimatedHours: 0,
          priority: 'medium'
        };
        module.tasks.push(task);
      });

      event.modules.push(module);
    });

    return event;
  }

  // Get template statistics
  getTemplateStats(templateId) {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const totalModules = template.defaultModules.length;
    const requiredModules = template.defaultModules.filter(m => m.required).length;
    const totalTasks = template.defaultModules.reduce((sum, module) => 
      sum + module.defaultTasks.length, 0
    );

    return {
      templateId,
      totalModules,
      requiredModules,
      optionalModules: totalModules - requiredModules,
      totalTasks,
      averageTasksPerModule: Math.round(totalTasks / totalModules)
    };
  }
}

// Example usage
const templateSystem = new EventTemplateSystem();

// Create a custom wedding template for Hyderabad region
const hyderabadWedding = templateSystem.cloneTemplate('marriage_template', 'Hyderabad Special Wedding', {
  additionalModules: [
    {
      category: 'security',
      name: 'Security Arrangements',
      priority: 9,
      required: false,
      defaultTasks: [
        'Security personnel deployment',
        'Crowd management',
        'VIP protection',
        'Emergency protocols'
      ]
    }
  ],
  modifyModules: {
    food: {
      metadata: {
        traditionalItems: ['biryani', 'haleem', 'qubani_ka_meetha', 'double_ka_meetha'],
        servingStyle: 'buffet',
        estimatedGuests: 800,
        speciality: 'hyderabadi_cuisine'
      }
    }
  }
});

// Generate an event from template
const weddingEvent = templateSystem.generateEventFromTemplate('marriage_template', {
  id: 'wedding_001',
  name: 'Rajesh & Priya Wedding',
  date: '2024-02-15',
  clientId: 'client_001',
  venue: 'Grand Palace, Hyderabad',
  estimatedGuests: 600,
  budget: 500000
});

module.exports = { EventTemplateSystem, templateSystem, weddingEvent };