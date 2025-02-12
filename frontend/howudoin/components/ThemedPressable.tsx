// import { Pressable, type PressableProps, StyleSheet } from 'react-native';
// import { useThemeColor } from '@/hooks/useThemeColor';

// export type ThemedPressableProps = PressableProps & {
//   lightColor?: string;
//   darkColor?: string;
//   type?: 'default' | 'primary' | 'secondary' | 'link';
// };

// export function ThemedPressable({
//   style,
//   lightColor,
//   darkColor,
//   type = 'default',
//   ...rest
// }: ThemedPressableProps) {
//   const backgroundColor = useThemeColor(
//     { light: lightColor || '#0a7ea4', dark: '#000000' },
//     'background'
//   );

//   const borderColor = useThemeColor(
//     { light: lightColor, dark: darkColor },
//     'border'
//   );

//   return (
//     <Pressable
//       style={({pressed}) => [
//         { 
//           backgroundColor,
//           borderColor,
//           borderWidth: 1,
//         },
//         type === 'default' ? styles.default : undefined,
//         type === 'primary' ? styles.primary : undefined,
//         type === 'secondary' ? styles.secondary : undefined,
//         type === 'link' ? styles.link : undefined,
//         pressed && styles.pressed,
//         style,
//       ]}
//       {...rest}
//     />
//   );
// }

// const styles = StyleSheet.create({
//   default: {
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//     minWidth: 120,
//   },
//   primary: {
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//     minWidth: 120,
//   },
//   secondary: {
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//     minWidth: 120,
//   },
//   link: {
//     padding: 8,
//     borderWidth: 0,
//   },
//   pressed: {
//     opacity: 0.7,
//   }
// });