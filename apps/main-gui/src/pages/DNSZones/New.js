import React from "react";
import Header from "../../components/Header";
import TableView from "./TableView";

class New extends React.PureComponent {
  render() {
    return (
      <div>
        <Header title="DNS Zones" />
        <TableView />
      </div>
    );
  }
}

export default New;
