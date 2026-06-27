import { StyleSheet } from 'react-native';

// ============ ЦВЕТА ============
export const colors = {
  // Основные
  primary: '#5F9EA0',
  primaryDark: '#4b8082',
  primaryLight: '#7fb8ba',
  accent: '#f99039',
  accentDark: '#e08530',
  
  // Текст
  textDark: '#2c3e50',
  textGray: '#666666',
  textLight: '#999999',
  textWhite: '#ffffff',
  
  // Фоны
  bgLight: '#fefcfc',
  bgGray: '#f5f5f5',
  white: '#ffffff',
  
  // Статусы
  success: '#2ecc71',
  danger: '#e74c3c',
  warning: '#f39c12',
  info: '#3498db',
  
  // Границы
  border: '#e0e0e0',
  borderLight: '#eeeeee',
};

// ============ ТЕНИ ============
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============ ГЛОБАЛЬНЫЕ СТИЛИ ============
export const globalStyles = StyleSheet.create({
  // ----- КОНТЕЙНЕРЫ -----
  container: {
    flex: 1,
    backgroundColor: colors.bgGray,
    paddingHorizontal: 5,
    paddingTop: 20,
    paddingBottom: 70,
  },
  containerNoTabs: {
    flex: 1,
    backgroundColor: colors.bgGray,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 80,
  },
  centerContainerNoTabs: {
    flex: 1,
    backgroundColor: colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },

  // ----- ТЕКСТ -----
  title: {
    fontSize: 36,
    fontFamily: 'Tobi',
    color: colors.textDark,
    marginBottom: 10,
  },
  titleLarge: {
    fontSize: 52,
    fontFamily: 'Tobi',
    color: colors.textDark,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 22,
    fontFamily: 'Tobi',
    color: colors.textGray,
    marginBottom: 15,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Tobi',
    color: colors.textDark,
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Tobi',
    color: colors.textDark,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    fontFamily: 'Tobi',
    color: colors.textGray,
    lineHeight: 24,
  },
  smallText: {
    fontSize: 14,
    fontFamily: 'Tobi',
    color: colors.textLight,
  },
  linkText: {
    color: colors.primary,
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Tobi',
  },

  // ----- КАРТОЧКИ -----
  card: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Tobi',
    color: colors.textDark,
  },
  cardAddress: {
    fontSize: 14,
    fontFamily: 'Tobi',
    color: colors.textGray,
    marginTop: 4,
  },
  cardInfo: {
    fontSize: 14,
    fontFamily: 'Tobi',
    color: colors.textGray,
    marginTop: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardBuilding: {
    fontSize: 13,
    fontFamily: 'Tobi',
    color: colors.primary,
    marginTop: 4,
  },

  // ----- КНОПКИ -----
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.small,
  },
  buttonAccent: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.small,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.small,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Tobi',
  },
  buttonTextOutline: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'Tobi',
  },

  // ----- ПОЛЯ ВВОДА -----
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Tobi',
    backgroundColor: colors.white,
    color: colors.textDark,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.danger,
  },

  // ----- АВАТАР -----
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 4,
    borderColor: colors.primary,
    ...shadows.medium,
  },
  avatarText: {
    fontSize: 50,
    fontFamily: 'Tobi',
  },

  // ----- МЕНЮ (главная) -----
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
  },
  menuCard: {
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    width: '42%',
    ...shadows.medium,
  },
  menuIcon: {
    fontSize: 54,
    marginBottom: 15,
  },
  menuText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: 'Tobi',
  },

  // ----- РУЛЕТКА -----
  rouletteButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
    ...shadows.medium,
  },

  // ----- ПРОЧЕЕ -----
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 50,
    fontSize: 16,
    fontFamily: 'Tobi',
  },
  badge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Tobi',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
});