import { Alert } from 'react-native';

export function showAlert(title: string, message: string) {
  Alert.alert(title, message);
}
