import React from 'react';
import {BrowserRouter, Switch} from "react-router-dom";
import PublicRoute from "./components/PublicRoute";
import PrivateRoute from "./components/PrivateRoute";
import page from "./pages";

export default props => {
	return (
		<BrowserRouter>
			<Switch>
				<PrivateRoute exact path="/dashboard" component={page.Dashboard} />
				<PrivateRoute exact path="/dnsrecords" component={page.DNSRecords.New} />
				<PrivateRoute exact path="/dnszones" component={page.DNSZones.New} />
				<PrivateRoute exact path="/domains" component={page.Domains.New} />
				<PrivateRoute exact path="/integrations" component={page.Integrations.New} />
				<PrivateRoute exact path="/organizations" component={page.Organizations.New} />
				<PrivateRoute exact path="/plans" component={page.Plans.New} />
				<PrivateRoute exact path="/platforms" component={page.Platforms.New} />
				<PublicRoute exact path="/policies" component={page.Policies} restricted={false} />
				<PublicRoute exact path="/signin" component={page.SignIn} restricted={true} />
				<PublicRoute exact path="/signup" component={page.SignUp} restricted={true} />
				<PublicRoute exact path="/" component={page.Home} restricted={false} />
			</Switch>
		</BrowserRouter>
	);
};