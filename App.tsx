import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SelectStocksScreen } from './src/screens/SelectStocksScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { PlaceholderTabScreen } from './src/screens/PlaceholderTabScreen';
import { WatchlistScreen } from './src/screens/WatchlistScreen';
import { BenefitsScreen } from './src/screens/BenefitsScreen';
import { FlowStepScreen } from './src/screens/FlowStepScreen';
import { AssetsScreen } from './src/screens/AssetsScreen';
import { DebateRoomScreen } from './src/screens/DebateRoomScreen';
import { OwlReportScreen } from './src/screens/OwlReportScreen';
import { MonthlyReportScreen } from './src/screens/MonthlyReportScreen';
import { ExploreMainScreen } from './src/screens/ExploreMainScreen';
import { StockTradeScreen } from './src/screens/StockTradeScreen';
import { SurveyScreen } from './src/screens/SurveyScreen';
import { PrinciplesScreen } from './src/screens/PrinciplesScreen';
import { StockPrincipleDetailScreen } from './src/screens/StockPrincipleDetailScreen';
import { Colors } from './src/config/colors';
import { PROTOTYPE_FLOW } from './src/flows/prototypeFlow';
import { UserSessionProvider } from './src/context/UserSessionContext';
import { NewsAlertProvider } from './src/context/NewsAlertContext';
import { SurveyLaunchGate } from './src/components/SurveyLaunchGate';
import { GlobalNewsModal } from './src/components/GlobalNewsModal';

const RootStack = createStackNavigator();
const StockMateStack = createStackNavigator();
const FlowStack = createStackNavigator();
const ExploreStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s = (c: any) => c as React.ComponentType<object>;

const stackScreenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: Colors.background },
};

function StockMateStackNavigator() {
  return (
    <StockMateStack.Navigator screenOptions={stackScreenOptions}>
      <StockMateStack.Screen name="SelectStocks" component={s(SelectStocksScreen)} />
      <StockMateStack.Screen name="Home" component={s(HomeScreen)} />
      <StockMateStack.Screen name="Chat" component={s(ChatScreen)} />
    </StockMateStack.Navigator>
  );
}

function PrototypeFlowStackNavigator() {
  return (
    <FlowStack.Navigator screenOptions={stackScreenOptions}>
      {PROTOTYPE_FLOW.map((step, index) => {
        const prev = PROTOTYPE_FLOW[index - 1]?.name;
        const next = PROTOTYPE_FLOW[index + 1]?.name;
        return (
          <FlowStack.Screen
            key={step.name}
            name={step.name}
            component={s(FlowStepScreen)}
            initialParams={{
              title: step.title,
              subtitle: step.subtitle ?? '버튼 클릭으로 다음 화면으로 이동하는 목업입니다.',
              prev,
              next,
            }}
          />
        );
      })}
    </FlowStack.Navigator>
  );
}

function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={stackScreenOptions}>
      <ExploreStack.Screen name="ExploreMain" component={s(ExploreMainScreen)} />
      <ExploreStack.Screen name="StockTrade" component={s(StockTradeScreen)} />
    </ExploreStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Menu"
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          backgroundColor: 'rgba(255,255,255,0.96)',
          paddingTop: 4,
          minHeight: 52,
        },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={s(ExploreStackNavigator)}
        options={{
          tabBarLabel: '탐색',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="Watchlist"
        component={s(WatchlistScreen)}
        options={{
          tabBarLabel: '관심',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="Charts"
        component={s(AssetsScreen)}
        options={{
          tabBarLabel: '자산',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-pie" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="Assets"
        component={s(BenefitsScreen)}
        options={{
          tabBarLabel: '혜택',
          tabBarIcon: ({ color, size }) => (
            <Feather name="tag" color={color} size={size ?? 21} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={s(MenuScreen)}
        options={{
          tabBarLabel: '메뉴',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserSessionProvider>
          <NewsAlertProvider>
            <SurveyLaunchGate>
              <NavigationContainer ref={navigationRef}>
                <StatusBar barStyle="dark-content" />
                <RootStack.Navigator screenOptions={stackScreenOptions}>
                  <RootStack.Screen name="MainTabs" component={MainTabs} />
                  <RootStack.Screen name="StockMate" component={StockMateStackNavigator} />
                  <RootStack.Screen name="PrototypeFlow" component={PrototypeFlowStackNavigator} />
                  <RootStack.Screen name="DebateRoom" component={s(DebateRoomScreen)} />
                  <RootStack.Screen name="OwlReport" component={s(OwlReportScreen)} />
                  <RootStack.Screen name="MonthlyReport" component={s(MonthlyReportScreen)} />
                  <RootStack.Screen name="Survey" component={s(SurveyScreen)} />
                  <RootStack.Screen name="Principles" component={s(PrinciplesScreen)} />
                  <RootStack.Screen name="StockPrincipleDetail" component={s(StockPrincipleDetailScreen)} />
                </RootStack.Navigator>
              </NavigationContainer>
            </SurveyLaunchGate>
            <GlobalNewsModal />
          </NewsAlertProvider>
        </UserSessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
