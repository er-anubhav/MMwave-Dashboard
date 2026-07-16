class Automation {
  final int id;
  final String title;
  final String description;
  final bool active;
  final String automationType; // 'routine' or 'rule'
  final String trigger;
  final String action;
  final int cooldownSeconds;
  final List<String> tags;
  final String time;
  final String? lastRunAt;
  final int runCount;
  final String? lastStatus;

  Automation({
    required this.id,
    required this.title,
    required this.description,
    required this.active,
    required this.automationType,
    required this.trigger,
    required this.action,
    required this.cooldownSeconds,
    required this.tags,
    required this.time,
    this.lastRunAt,
    required this.runCount,
    this.lastStatus,
  });

  factory Automation.fromJson(Map<String, dynamic> json) {
    // Determine triggers/actions from data JSON
    final data = json['data'] ?? {};
    final triggerVal = data['trigger'] ?? 'Presence detected';
    final actionVal = data['action'] ?? 'Set mode to Sleep';
    final cooldownVal = data['cooldown_seconds'] ?? 60;
    
    List<String> tagsVal = [];
    if (data['tags'] != null) {
      tagsVal = List<String>.from(data['tags']);
    } else if (json['tags'] != null) {
      tagsVal = List<String>.from(json['tags']);
    }

    final timeVal = data['time'] ?? 'Condition-driven';

    return Automation(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      active: json['active'] ?? false,
      automationType: json['automation_type'] ?? 'routine',
      trigger: triggerVal,
      action: actionVal,
      cooldownSeconds: cooldownVal is int ? cooldownVal : int.tryParse(cooldownVal.toString()) ?? 60,
      tags: tagsVal,
      time: timeVal,
      lastRunAt: json['last_run_at'],
      runCount: json['run_count'] ?? 0,
      lastStatus: json['last_status'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'active': active,
      'automation_type': automationType,
      'data': {
        'trigger': trigger,
        'action': action,
        'cooldown_seconds': cooldownSeconds,
        'tags': tags,
        'time': time,
      }
    };
  }
}
