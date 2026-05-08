// Minimal Jest setup replacing react-native/jest/setup.js
// (RN 0.81 setup.js uses newer Flow syntax incompatible with metro-react-native-babel-preset 0.76)

global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

global.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
