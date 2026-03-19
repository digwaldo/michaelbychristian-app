import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Gallery() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Gallery page</Text>
      <Link href="/">Back home</Link>
    </View>
  );
}
