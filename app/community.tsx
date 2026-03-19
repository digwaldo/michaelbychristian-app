import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Community() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Community page</Text>
      <Link href="/">Back home</Link>
    </View>
  );
}
