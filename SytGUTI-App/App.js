import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, globalStyles, shadows } from './styles';

const API_URL = 'http://192.168.0.105:8000/api';

// ============================================================
// КОМПОНЕНТЫ
// ============================================================

// ---------- ЭКРАН ВХОДА ----------
function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Ошибка', 'Введите имя пользователя и пароль');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/token/`, {
        username,
        password,
      });

      await AsyncStorage.setItem('access_token', response.data.access);
      await AsyncStorage.setItem('refresh_token', response.data.refresh);

      Alert.alert('Успех', 'Вход выполнен!');
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Ошибка', 'Неверное имя пользователя или пароль');
    }
    setLoading(false);
  };

  return (
    <View style={globalStyles.centerContainerNoTabs}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgLight} />
      <Text style={globalStyles.titleLarge}>🍔 СытГУТИ</Text>
      <Text style={globalStyles.subtitle}>Войдите в аккаунт</Text>

      <TextInput
        style={globalStyles.input}
        placeholder="Имя пользователя"
        placeholderTextColor={colors.textLight}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Пароль"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={globalStyles.buttonAccent} onPress={handleLogin} disabled={loading}>
        <Text style={globalStyles.buttonText}>{loading ? '⏳ Загрузка...' : 'Войти'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={globalStyles.linkText}>Нет аккаунта? Зарегистрироваться</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- ЭКРАН РЕГИСТРАЦИИ ----------
function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register/`, {
        username,
        password,
        email,
      });

      Alert.alert('Успех', 'Регистрация выполнена! Теперь войдите.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Ошибка', 'Пользователь уже существует или ошибка сервера');
    }
    setLoading(false);
  };

  return (
    <View style={globalStyles.centerContainerNoTabs}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgLight} />
      <Text style={[globalStyles.title, { fontSize: 32 }]}>📝 Регистрация</Text>

      <TextInput
        style={globalStyles.input}
        placeholder="Имя пользователя"
        placeholderTextColor={colors.textLight}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Email (необязательно)"
        placeholderTextColor={colors.textLight}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Пароль"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={globalStyles.buttonAccent} onPress={handleRegister} disabled={loading}>
        <Text style={globalStyles.buttonText}>{loading ? '⏳ Загрузка...' : 'Зарегистрироваться'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={globalStyles.linkText}>Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- ЭКРАН СПИСКА ЗАВЕДЕНИЙ ----------
function PlacesScreen() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      const response = await axios.get(`${API_URL}/places/`);
      setPlaces(response.data);
      await AsyncStorage.setItem('cached_places', JSON.stringify(response.data));
    } catch (error) {
      const cached = await AsyncStorage.getItem('cached_places');
      if (cached) {
        setPlaces(JSON.parse(cached));
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgGray} />
      <Text style={globalStyles.screenTitle}>🍽️ Заведения</Text>
      {places.length === 0 ? (
        <Text style={globalStyles.emptyText}>Нет заведений. Добавьте через админку.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {places.map((place) => (
            <TouchableOpacity key={place.id} style={globalStyles.card} activeOpacity={0.8}>
              <Text style={globalStyles.cardTitle}>{place.name}</Text>
              <Text style={globalStyles.cardAddress}>📍 {place.address}</Text>
              <View style={globalStyles.cardRow}>
                <Text style={globalStyles.cardInfo}>💰 {place.avg_price || '—'} ₽</Text>
                <Text style={[globalStyles.cardInfo, { color: colors.warning }]}>
                  ⭐ {place.rating_display || 0}
                </Text>
              </View>
              {place.nearest_building && (
                <View style={[globalStyles.row, { marginTop: 6 }]}>
                  <Text style={[globalStyles.smallText, { color: colors.primary }]}>
                    🏛️ Ближайший корпус: {place.nearest_building}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ---------- ЭКРАН РУЛЕТКИ ----------
function RouletteScreen() {
  return (
    <View style={globalStyles.centerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgLight} />
      <Text style={globalStyles.title}>🎲 Обед-рулетка</Text>
      <Text style={[globalStyles.subtitle, { textAlign: 'center' }]}>
        Найди собеседника для обеда!
      </Text>

      <TouchableOpacity style={[globalStyles.rouletteButton, { backgroundColor: colors.accent }]}>
        <Text style={globalStyles.buttonText}>👤 Найти собеседника</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[globalStyles.rouletteButton, { backgroundColor: colors.primary }]}>
        <Text style={globalStyles.buttonText}>👥 Найти компанию</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- ЭКРАН СООБЩЕНИЙ ----------
function MessagesScreen() {
  return (
    <View style={globalStyles.centerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgLight} />
      <Text style={globalStyles.title}>💬 Сообщения</Text>
      <Text style={globalStyles.subtitle}>Здесь будут ваши чаты</Text>
    </View>
  );
}

// ---------- ЭКРАН УВЕДОМЛЕНИЙ ----------
function NotificationsScreen() {
  return (
    <View style={globalStyles.centerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgLight} />
      <Text style={globalStyles.title}>🔔 Уведомления</Text>
      <Text style={globalStyles.subtitle}>Здесь будут ваши уведомления</Text>
    </View>
  );
}

// ---------- ЭКРАН ПРОФИЛЯ ----------
function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const response = await axios.get(`${API_URL}/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      navigation.replace('Login');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const username = user?.user?.username || 'Пользователь';
  const email = user?.user?.email || 'Email не указан';
  const avatarUrl = user?.avatar ? `${API_URL.replace('/api', '')}${user.avatar}` : null;

  return (
    <View style={globalStyles.centerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgLight} />
      
      <View style={globalStyles.avatar}>
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={{ width: 150, height: 150, borderRadius: 75 }}
          />
        ) : (
          <Text style={globalStyles.avatarText}>👤</Text>
        )}
      </View>

      <Text style={globalStyles.heading}>{username}</Text>
      
      <Text style={[globalStyles.smallText, { color: colors.textGray, marginBottom: 8 }]}>
        {email}
      </Text>

      <View style={styles.profileInfo}>
        {user?.course && <Text style={styles.infoText}>🎓 Курс: {user.course}</Text>}
        {user?.group && <Text style={styles.infoText}>👥 Группа: {user.group}</Text>}
        {user?.favorite_cuisine && <Text style={styles.infoText}>🍽️ Любимая кухня: {user.favorite_cuisine}</Text>}
        {user?.bio && <Text style={[styles.infoText, { marginTop: 8 }]}>{user.bio}</Text>}
      </View>

      <View style={styles.contactsContainer}>
        {user?.telegram && <Text style={styles.contactText}>📱 Telegram: {user.telegram}</Text>}
        {user?.vk && <Text style={styles.contactText}>📘 VK: {user.vk}</Text>}
      </View>

      <View style={styles.ratingContainer}>
        <Text style={styles.ratingText}>
          ⭐ Рейтинг: {user?.rating || 0} ({user?.rating_count || 0} оценок)
        </Text>
      </View>

      <TouchableOpacity style={[globalStyles.buttonDanger, { marginTop: 20 }]} onPress={handleLogout}>
        <Text style={globalStyles.buttonText}>🚪 Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  profileInfo: { width: '100%', paddingHorizontal: 20, marginTop: 30 },
  infoText: { fontSize: 18, fontFamily: 'Tobi', color: colors.textDark, marginBottom: 8 },
  contactsContainer: { width: '100%', paddingHorizontal: 20, marginTop: 20 },
  contactText: { fontSize: 16, fontFamily: 'Tobi', color: colors.primary, marginBottom: 4 },
  ratingContainer: { marginTop: 10, paddingHorizontal: 70, width: '100%' },
  ratingText: { fontSize: 18, fontFamily: 'Tobi', color: colors.textGray },
});

// ---------- ГЛАВНЫЙ ЭКРАН ----------
function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setShowResults(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/places/search/?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
      setShowResults(response.data.length > 0);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    }
  };

  return (
    <View style={globalStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgGray} />
      
      <View style={searchStyles.searchContainer}>
        <TextInput
          style={searchStyles.searchInput}
          placeholder="🔍 Поиск заведений..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {showResults ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {searchResults.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={globalStyles.card}
              onPress={() => navigation.navigate('Places')}
              activeOpacity={0.8}
            >
              <Text style={globalStyles.cardTitle}>{place.name}</Text>
              <Text style={globalStyles.cardAddress}>📍 {place.address}</Text>
              <Text style={globalStyles.cardInfo}>💰 {place.avg_price || '—'} ₽</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={globalStyles.centerContainerNoTabs}>
          <Text style={globalStyles.titleLarge}>🍔 СытГУТИ</Text>
          <Text style={[globalStyles.subtitle, { textAlign: 'center' }]}>
            Найди место для обеда!
          </Text>

          <View style={globalStyles.menuContainer}>
            <TouchableOpacity
              style={[globalStyles.menuCard, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Places')}
              activeOpacity={0.8}
            >
              <Text style={globalStyles.menuIcon}>🍴</Text>
              <Text style={globalStyles.menuText}>Заведения</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.menuCard, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('Roulette')}
              activeOpacity={0.8}
            >
              <Text style={globalStyles.menuIcon}>🎲</Text>
              <Text style={globalStyles.menuText}>Обед-рулетка</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  searchContainer: { marginBottom: 16 },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Tobi',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textDark,
  },
});

// ============================================================
// НАВИГАЦИЯ
// ============================================================

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          tabBarStyle: {
            backgroundColor: '#fefcfc',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            height: 60,
            paddingTop: 2,
            paddingBottom: 10,
            elevation: 0,
            shadowOpacity: 0,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Tobi',
            marginTop: 5,
          },
        }}
      >
        <Tab.Screen
          name="Главная"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 27, color, marginBottom: 0, lineHeight: 28 }}>🏠</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Сообщения"
          component={MessagesScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 25, color, marginBottom: 0, lineHeight: 28 }}>💬</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Уведомления"
          component={NotificationsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 26, color, marginBottom: 0, lineHeight: 28 }}>🔔</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Профиль"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 25, color, marginBottom: 0, lineHeight: 28 }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ============================================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================================

export default function App() {
  const [fontsLoaded] = useFonts({
    'Tobi': require('./assets/fonts/Tobi.otf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgLight }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgLight }} edges={['top']}>
        <NavigationContainer>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false 
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* 👇 ЭТИ ЭКРАНЫ БУДУТ СО СТРЕЛКОЙ НАЗАД */}
            <Stack.Screen 
              name="Places" 
              component={PlacesScreen} 
              options={{
                headerShown: true,
                headerTitle: 'Заведения',
                headerStyle: {
                  backgroundColor: colors.bgLight,
                },
                headerTitleStyle: {
                  fontFamily: 'Tobi',
                  fontSize: 20,
                  color: colors.textDark,
                },
                headerTintColor: colors.primary,
              }}
            />
            
            <Stack.Screen 
              name="Roulette" 
              component={RouletteScreen}
              options={{
                headerShown: true,
                headerTitle: 'Обед-рулетка',
                headerStyle: {
                  backgroundColor: colors.bgLight,
                },
                headerTitleStyle: {
                  fontFamily: 'Tobi',
                  fontSize: 20,
                  color: colors.textDark,
                },
                headerTintColor: colors.primary,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}