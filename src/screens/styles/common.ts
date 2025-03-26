import { StyleSheet } from 'react-native';

// Common styles that can be shared across multiple screens
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  headerButton: {
    marginLeft: 8,
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  surface: {
    padding: 16,
    marginVertical: 16,
    borderRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
  error: {
    marginVertical: 8,
    padding: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 24,
  },
  emptyText: {
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
  },
});

// Card styles that can be used for consistent card appearance
export const cardStyles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 8,
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
});

// Form styles for consistent form appearance
export const formStyles = StyleSheet.create({
  formContainer: {
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 4,
  },
  title: {
    alignSelf: 'center',
    marginVertical: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    marginVertical: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  link: {
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

// Auth specific styles
export const authStyles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    height: 200,
    width: 200,
  },
  themeSwitchContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  themeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});