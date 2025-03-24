export type MainStackParamList = {
	MainTabs: undefined;
	SecondScreen: undefined;
	AddStock: undefined;
	EditStock: {
		item: {
			id?: string;
			symbol: string;
			shares: number;
			avg_price: number;
			target_price?: number;
			notes?: string;
		};
	};
	OptionsChain: {
		symbol: string;
	};
	OptionDetail: {
		option: any; // Using any here for simplicity, but should be properly typed in a production app
	};
};

export type AuthStackParamList = {
	Login: undefined;
	Register: undefined;
	ForgetPassword: undefined;
};

export type MainTabsParamList = {
	Home: undefined;
	Portfolio: undefined;
	Profile: undefined;
	About: undefined;
};