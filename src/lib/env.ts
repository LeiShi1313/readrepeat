export const isDev = process.env.NODE_ENV === 'development';

export const appConfig = {
  name: isDev ? 'ReadRepeat [DEV]' : 'ReadRepeat',
  themeColor: isDev ? '#f97316' : '#3b82f6',
  headerText: isDev ? 'text-orange-500' : 'text-gray-900',
};
