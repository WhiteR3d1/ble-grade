import { useBle } from '@/ble/use-ble';
import { CharacteristicPicker } from '@/components/characteristic-picker';
import { DeviceView } from '@/components/device-view';
import { ScanView } from '@/components/scan-view';

export default function HomeScreen() {
  const ble = useBle();
  const { connected, selected } = ble;

  if (connected && selected) {
    return (
      <DeviceView
        key={`${connected.id}/${selected.serviceUUID}/${selected.uuid}`}
        ble={ble}
        device={connected}
        characteristic={selected}
      />
    );
  }
  // "Any device" mode: choose a characteristic first
  if (connected) {
    return <CharacteristicPicker key={connected.id} ble={ble} device={connected} />;
  }
  return <ScanView ble={ble} />;
}
