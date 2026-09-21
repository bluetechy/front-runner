import React from "react";
import Header from "../../components/Header";
import TableView from "./TableView";

class New extends React.PureComponent {
  render() {
    return (
      <div>
        <Header title="Organizations" />
        <TableView />
      </div>
    );
  }
}

export default New;
