import { Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome } from '@expo/vector-icons';

export default function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    async function handleRegister() {
        if (!firstName) {
            Alert.alert('Error 400: Bad Request ', 'A user should have a first name');
            return;
        }
        if (!lastName) {
            Alert.alert('Error 400: Bad Request ', 'A user should have a last name');
            return;
        }
        if (!email) {
            Alert.alert('Error 400: Bad Request ', 'A user should have an email');
        }
        if (!password) {
            Alert.alert('Error 400: Bad Request ', 'A user should have a password');
            return;
        }

        try {
            const response = await fetch('http://10.0.2.2:8080/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password
                })
            });

            const result = await response.text();

            if (response.ok) {
                Alert.alert('Success', result, [
                    { text: 'OK', onPress: () => router.replace('/') }
                ]);
            } else {
                Alert.alert('Error', result);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to connect to server');
        }
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Register</ThemedText>
            <TextInput 
            style={styles.textBoxes}
            placeholder="First Name"
            onChangeText={setFirstName}
            />
            <TextInput 
            style={styles.textBoxes}
            placeholder="Last Name"
            onChangeText={setLastName}
            />
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
            <Pressable style={styles.button} onPress={handleRegister}>
            <ThemedText style={styles.buttonText}>Register</ThemedText>
            </Pressable>
            
            <Pressable onPress={() => router.back()}>
            <ThemedText style={{ color: '#5c9eff', marginTop: 20, textDecorationLine: 'underline' }}>
                Back to Login Page
            </ThemedText>
            </Pressable>
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
        justifyContent: 'center',
        alignItems: 'center',
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
    backButton: {
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
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
    themeInfo: {
        position: 'absolute',
        bottom: 20,
        textAlign: 'center',
        fontSize: 14,
        color: '#5c9eff',
        fontStyle: 'italic'
    },
});