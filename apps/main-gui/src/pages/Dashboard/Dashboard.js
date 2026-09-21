import React from "react";
import Header from "../../components/Header";
import DashboardTabs from "./DashboardTabs.js";

export default (props) => {
  return (
    <div>
      <Header title="Dashboard" />
      <DashboardTabs />
    </div>
  );
};
