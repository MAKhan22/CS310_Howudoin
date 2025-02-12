import { StyleSheet, TextInput, Alert, Pressable } from "react-native";
import { useState } from "react";
import { useRouter, Link } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { setToken, setUserEmail } from '@/constants/auth';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from "@expo/vector-icons";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    async function handleLogin() {
        if (!email) {
            Alert.alert("Error 400: Bad Request", "Email is missing");
            return;
        }
        if (!password) {
            Alert.alert("Error 400: Bad Request", "Password is missing");
            return;
        }

        try {
            const response = await fetch("http://10.0.2.2:8080/login", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const result = await response.text();
            
            if (response.ok) {
                await AsyncStorage.setItem('token', result);
                await AsyncStorage.setItem('email', email);

                // After successful login, fetch user details
                const userResponse = await fetch('http://10.0.2.2:8080/search/members', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${result}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: email,
                        receiver: email
                    })
                });

                if (userResponse.ok) {
                    const users = await userResponse.json();
                    if (users && users.length > 0) {
                        // Store user details in AsyncStorage
                        await AsyncStorage.setItem('currentUserDetails', JSON.stringify(users[0]));
                    }
                }

                Alert.alert('Success', "Successfully Logged in!", [
                    { text: 'OK', onPress: () => router.replace('/chats') }
                ]);
            } else {
                Alert.alert("Error", result);
            }
        } catch (error) {
            console.log('Login error:', error);
            Alert.alert("Error", "Failed to connect to server");
        }
    }
    //mak22@example.com
    //MAKhan#123

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Login</ThemedText>
            <TextInput 
                style={styles.textBoxes}
                placeholder="Email"
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <ThemedView style={styles.passwordContainer}>
                <TextInput 
                    style={[styles.textBoxes, styles.passwordInput]}
                    placeholder="Password"
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <Pressable 
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                >
                    <FontAwesome 
                        name={showPassword ? "eye-slash" : "eye"} 
                        size={15} 
                        color="#5c9eff" 
                    />
                </Pressable>
            </ThemedView>
            <Pressable style={styles.button} onPress={handleLogin}>
                <ThemedText style={styles.buttonText}>Login</ThemedText>
            </Pressable>
            
            <ThemedView style={styles.registerContainer}>
                <ThemedText>No account? </ThemedText>
                <Link href="/register" style={styles.registerLink}>Create one!</Link>
            </ThemedView>
            
            <ThemedText style={styles.themeInfo}>
                {/* App theme (dark/light) follows your default theme{'\n'} */}
                Change the default theme in your device{'\n'} settings and enjoy the app in your preferred theme
            </ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        position: 'relative',
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    textBoxes: {
        height: 40,
        width: 200,
        borderWidth: 1,
        borderColor: 'black',
        borderRadius: 10,
        marginTop: 5,
        marginBottom: 10,
        backgroundColor: 'white',
        paddingHorizontal: 10,
    },
    button: {
        marginTop: 10,
        backgroundColor: '#151718',
        borderColor: '#fff',
        borderWidth: 1,
        height: 40,
        width: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    registerButton: {
        backgroundColor: '#151718',
        borderColor: '#fff',
        borderWidth: 1,
        marginTop: 10,
    },
    buttonText: {
        fontSize: 16,
        color: 'white',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        width: 200,
    },
    passwordInput: {
        flex: 1,
    },
    eyeIcon: {
        position: 'absolute',
        right: 10,
        height: '100%',
        justifyContent: 'center',
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    registerLink: {
        color: '#5c9eff',
        textDecorationLine: 'underline',
    },
    themeInfo: {
        position: 'absolute',
        bottom: 20,
        textAlign: 'center',
        fontSize: 14,
        color: '#5c9eff',
        fontStyle: 'italic'
    },
});