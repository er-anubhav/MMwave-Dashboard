import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../models/automation.dart';
import '../widgets/glass_card.dart';

class AutomationsScreen extends StatefulWidget {
  const AutomationsScreen({Key? key}) : super(key: key);

  @override
  State<AutomationsScreen> createState() => _AutomationsScreenState();
}

class _AutomationsScreenState extends State<AutomationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _cooldownController = TextEditingController(text: '60');
  
  String _selectedType = 'routine'; // 'routine' or 'rule'
  String _selectedTrigger = 'presence detected';
  String _selectedAction = 'turn relay on';
  TimeOfDay _selectedTime = const TimeOfDay(hour: 8, minute: 0);

  final List<String> _ruleTriggers = [
    'presence detected',
    'fall detected',
    'sleep state is deep sleep',
  ];

  final List<String> _actions = [
    'set mode to sleep',
    'set mode to fall detection',
    'turn relay on',
    'turn relay off',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DeviceProvider>(context, listen: false).loadAutomations();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _descController.dispose();
    _cooldownController.dispose();
    super.dispose();
  }

  void _showCreateDialog() {
    _titleController.clear();
    _descController.clear();
    _cooldownController.text = '60';
    _selectedType = 'routine';
    _selectedTrigger = 'presence detected';
    _selectedAction = 'turn relay on';
    _selectedTime = const TimeOfDay(hour: 8, minute: 0);

    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final selectedDevice = deviceProvider.selectedDevice;
    final isStd = selectedDevice?.name.toUpperCase().contains('STD') ?? false;

    if (isStd) {
      if (_selectedTrigger == 'sleep state is deep sleep') {
        _selectedTrigger = 'presence detected';
      }
      if (_selectedAction == 'set mode to sleep') {
        _selectedAction = 'turn relay on';
      }
    }

    final ruleTriggersToUse = isStd
        ? _ruleTriggers.where((t) => t != 'sleep state is deep sleep').toList()
        : _ruleTriggers;
    final actionsToUse = isStd
        ? _actions.where((a) => a != 'set mode to sleep').toList()
        : _actions;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final isRoutine = _selectedType == 'routine';
            return AlertDialog(
              backgroundColor: const Color(0xFF13261C),
              insetPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.zero,
              ),
              title: const Text('New Automation', style: TextStyle(color: Colors.white)),
              content: SizedBox(
                width: MediaQuery.of(context).size.width,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                    TextField(
                      controller: _titleController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _descController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Type Selection
                    DropdownButtonFormField<String>(
                      value: _selectedType,
                      dropdownColor: const Color(0xFF13261C),
                      decoration: const InputDecoration(
                        labelText: 'Type',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                      style: const TextStyle(color: Colors.white),
                      items: const [
                        DropdownMenuItem(value: 'routine', child: Text('Routine (Schedule-based)')),
                        DropdownMenuItem(value: 'rule', child: Text('Rule (Event-driven)')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            _selectedType = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 16),

                    // Trigger Option
                    if (isRoutine) ...[
                      // Time picker button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Scheduled Time', style: TextStyle(color: Colors.white, fontSize: 14)),
                          TextButton(
                            onPressed: () async {
                              final picked = await showTimePicker(
                                context: context,
                                initialTime: _selectedTime,
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  _selectedTime = picked;
                                });
                              }
                            },
                            child: Text(
                              _selectedTime.format(context),
                              style: const TextStyle(color: Color(0xFFA7DEC5), fontWeight: FontWeight.normal),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      // Select trigger rule dropdown
                      DropdownButtonFormField<String>(
                        value: _selectedTrigger,
                        dropdownColor: const Color(0xFF13261C),
                        decoration: const InputDecoration(
                          labelText: 'Event Trigger',
                          labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                          enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                          focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                        ),
                        style: const TextStyle(color: Colors.white),
                        items: ruleTriggersToUse.map((t) {
                          return DropdownMenuItem(value: t, child: Text(t));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setDialogState(() {
                              _selectedTrigger = val;
                            });
                          }
                        },
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Target Action Dropdown
                    DropdownButtonFormField<String>(
                      value: _selectedAction,
                      dropdownColor: const Color(0xFF13261C),
                      decoration: const InputDecoration(
                        labelText: 'Action Target',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                      style: const TextStyle(color: Colors.white),
                      items: actionsToUse.map((a) {
                        return DropdownMenuItem(value: a, child: Text(a));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            _selectedAction = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _cooldownController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Cooldown (Seconds)',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
                ),
                ElevatedButton(
                  onPressed: () => _submitCreate(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFA7DEC5),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                  ),
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _submitCreate(BuildContext dialogContext) async {
    final title = _titleController.text.trim();
    final description = _descController.text.trim();
    final cooldown = int.tryParse(_cooldownController.text) ?? 60;

    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Title is required')),
      );
      return;
    }

    Navigator.pop(dialogContext);

    String triggerStr = _selectedTrigger;
    String timeStr = 'Condition-driven';

    if (_selectedType == 'routine') {
      final hour = _selectedTime.hour;
      final minute = _selectedTime.minute;
      final period = hour >= 12 ? 'PM' : 'AM';
      final formattedHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      final padMinute = minute.toString().padLeft(2, '0');
      
      timeStr = '$formattedHour:$padMinute $period';
      triggerStr = 'Time is $timeStr';
    }

    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final success = await deviceProvider.createAutomation(
      title: title,
      description: description,
      automationType: _selectedType,
      trigger: triggerStr,
      action: _selectedAction,
      cooldownSeconds: cooldown,
      time: timeStr,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Automation created successfully')),
      );
    }
  }

  void _deleteAutomation(Automation automation) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF13261C),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        title: const Text('Delete Automation', style: TextStyle(color: Colors.white)),
        content: Text('Are you sure you want to delete "${automation.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7F1D1D),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4.0),
              ),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
      final success = await deviceProvider.deleteAutomation(automation.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Automation deleted successfully')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0B1410),
      appBar: AppBar(
        title: const Text('Automations', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF13261C),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFA7DEC5),
          unselectedLabelColor: const Color(0xFF9CAAA2),
          indicatorColor: const Color(0xFFA7DEC5),
          indicatorWeight: 2,
          tabs: const [
            Tab(text: 'Routines'),
            Tab(text: 'Rules'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRoutinesTab(deviceProvider),
          _buildRulesTab(deviceProvider),
          _buildHistoryTab(deviceProvider),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        backgroundColor: const Color(0xFFA7DEC5),
        foregroundColor: Colors.black,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4.0),
        ),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildRoutinesTab(DeviceProvider provider) {
    if (provider.routines.isEmpty) {
      return const Center(
        child: Text('No daily routines configured.', style: TextStyle(color: Color(0xFF9CAAA2))),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: provider.routines.length,
      itemBuilder: (context, index) {
        final routine = provider.routines[index];
        return _buildAutomationCard(routine, provider);
      },
    );
  }

  Widget _buildRulesTab(DeviceProvider provider) {
    if (provider.rules.isEmpty) {
      return const Center(
        child: Text('No rules configured.', style: TextStyle(color: Color(0xFF9CAAA2))),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: provider.rules.length,
      itemBuilder: (context, index) {
        final rule = provider.rules[index];
        return _buildAutomationCard(rule, provider);
      },
    );
  }

  Widget _buildAutomationCard(Automation automation, DeviceProvider provider) {
    return GlassCard(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      automation.title,
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.normal),
                    ),
                    if (automation.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        automation.description,
                        style: const TextStyle(color: Color(0xFF9CAAA2), fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
              Switch(
                value: automation.active,
                activeColor: const Color(0xFFA7DEC5),
                onChanged: (val) {
                  provider.toggleAutomation(automation, val);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Color(0xFF1F3B2D)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMetricColumn('Trigger', automation.trigger),
              _buildMetricColumn('Target Action', automation.action),
              _buildMetricColumn('Run Count', automation.runCount.toString(), isMonospace: true),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.redAccent, size: 20),
                onPressed: () => _deleteAutomation(automation),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(DeviceProvider provider) {
    final history = provider.automationHistory;

    if (history.isEmpty) {
      return const Center(
        child: Text('No run history available.', style: TextStyle(color: Color(0xFF9CAAA2))),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: history.length,
      itemBuilder: (context, index) {
        final run = history[index];
        final metadata = run['metadata'] ?? {};
        
        return GlassCard(
          margin: const EdgeInsets.symmetric(vertical: 6.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFF13261C),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.play_arrow, color: Color(0xFFA7DEC5), size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      run['event'] ?? 'Automation Executed',
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.normal),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Action: ${metadata['action'] ?? 'N/A'} (Result: ${metadata['result'] ?? 'Success'})',
                      style: const TextStyle(color: Color(0xFF9CAAA2), fontSize: 11),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    run['created_at'] != null ? run['created_at'].toString().split(' ').last : '',
                    style: GoogleFonts.jetBrainsMono(color: const Color(0xFF9CAAA2), fontSize: 11),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    (run['status'] ?? 'Success').toUpperCase(),
                    style: GoogleFonts.jetBrainsMono(
                      color: const Color(0xFFA7DEC5),
                      fontSize: 11,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricColumn(String label, String value, {bool isMonospace = false}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF9CAAA2), fontSize: 10, fontWeight: FontWeight.normal)),
          const SizedBox(height: 4),
          Text(
            value,
            style: isMonospace
                ? GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 12, fontWeight: FontWeight.normal)
                : const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
