// react-native-web's Alert.alert does nothing, so use the browser dialog
export function showAlert(title: string, message: string) {
  window.alert(`${title}\n\n${message}`);
}
