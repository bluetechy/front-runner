import { createSlice } from '@reduxjs/toolkit';

const { awaiter } = require('../utilities/async.js');

const getUser = () => {
	if (localStorage.getItem('user')) {
		try {
			return JSON.parse(localStorage.getItem('user'))
		}
		catch (e) {}
	}
	return null;
}

const initialState = getUser();

const slice = createSlice({
	name: 'user',
	initialState: {
		user: initialState,
	},
	reducers: {
		onSignIn: (state, action) => {
			state.user = action.payload;
			localStorage.setItem('user', JSON.stringify(action.payload));
		},
		onSignUp: (state, action) => {
			state.user = action.payload;
			localStorage.setItem('user', JSON.stringify(action.payload));
		},
		onSignOut: (state) =>  {
			state.user = null;
			localStorage.removeItem('user');
		},
	},
});

export default slice.reducer;

const { onSignIn, onSignUp, onSignOut } = slice.actions;

export const signin = ({ email, password }) => async dispatch => {
	const [, result] = await awaiter(fetch("http://localhost:30000/v1/tokens", {
		body: JSON.stringify({
			email: email || '',
			password: password || '',
		}),
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
	}));
	const user = (result.ok)
		? await result.json()
		: null;
	return dispatch(onSignIn(user));
};

export const signup = ({ name, email, password }) => async dispatch => {
	const [, result] = await awaiter(fetch("http://localhost:30000/v1/users", {
		body: JSON.stringify({
			name: name || '',
			email: email || '',
			password: password || '',
		}),
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
	}));
	const user = (result.ok)
		? await result.json()
		: null;
	return dispatch(onSignUp(user));
};

export const signout = () => async dispatch => {
	const user = getUser();
	if (user && user.token) {
		awaiter(fetch("http://localhost:30000/v1/tokens", {
			headers: {
				'authorization': `Bearer ${user.token}`,
			},
			method: 'DELETE',
		}));
	}
	return dispatch(onSignOut());
};
