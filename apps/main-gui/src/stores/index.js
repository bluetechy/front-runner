import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

import user from "../reducers/user.js";

const reducer = combineReducers({
  user: user,
});

const store = configureStore({
  reducer,
});

export default store;
