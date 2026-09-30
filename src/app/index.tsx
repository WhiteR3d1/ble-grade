import { useBle } from '@/ble/use-ble';
import { DeviceView } from '@/components/device-view';
import { ScanView } from '@/components/scan-view';

export default function HomeScreen() {
  const ble = useBle();

  if (ble.connected) {
    return <DeviceView key={ble.connected.id} ble={ble} device={ble.connected} />;
  }
  return <ScanView ble={ble} />;
}
