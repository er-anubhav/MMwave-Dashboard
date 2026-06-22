import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from './AuthContext';

const DeviceContext = createContext(null);

export const DeviceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load devices when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDevices();
    } else {
      setDevices([]);
      setSelectedDevice(null);
    }
  }, [isAuthenticated]);

  // Auto-select first device or load from localStorage
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      const savedDeviceId = localStorage.getItem('selected_device_id');
      const deviceToSelect = devices.find(d => d.device_id === savedDeviceId) || devices[0];
      setSelectedDevice(deviceToSelect);
    }
  }, [devices]);

  // Save selected device to localStorage
  useEffect(() => {
    if (selectedDevice) {
      localStorage.setItem('selected_device_id', selectedDevice.device_id);
    }
  }, [selectedDevice]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/devices`);
      
      // Backend returns array directly or wrapped in devices property
      const devicesList = Array.isArray(response.data) ? response.data : response.data.devices || [];
      setDevices(devicesList);
      
      // If no device is selected and devices exist, select the first one
      if (!selectedDevice && devicesList.length > 0) {
        setSelectedDevice(devicesList[0]);
      }
    } catch (error) {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const linkDevice = async (deviceId, name, deviceType = 'LYFSense_switch') => {
    try {
      const response = await api.post(`/devices/link`, {
        device_id: deviceId,
        name: name,
        device_type: deviceType
      });

      await loadDevices();

      return {
        success: true,
        message: response.data.message,
        apiKey: response.data.api_key
      };
    } catch (error) {
      let errorMessage = 'Failed to link device';
      const responseData = error.response?.data;
      
      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail[0]?.msg || 'Failed to link device';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const unlinkDevice = async (deviceId) => {
    try {
      await api.delete(`/devices/${deviceId}/unlink`);
      
      // If we unlinked the selected device, clear selection
      if (selectedDevice?.device_id === deviceId) {
        setSelectedDevice(null);
      }

      await loadDevices();
      return { success: true };
    } catch (error) {
      let errorMessage = 'Failed to unlink device';
      const responseData = error.response?.data;
      
      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail[0]?.msg || 'Failed to unlink device';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const updateDevice = async (deviceId, name) => {
    try {
      await api.patch(`/devices/${deviceId}`, { name });
      await loadDevices();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update device'
      };
    }
  };

  const selectDevice = (device) => {
    setSelectedDevice(device);
  };

  const value = {
    devices,
    selectedDevice,
    loading,
    loadDevices,
    linkDevice,
    unlinkDevice,
    updateDevice,
    selectDevice
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
