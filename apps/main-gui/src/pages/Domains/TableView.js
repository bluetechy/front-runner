import React, { useEffect, useState } from "react";
import { Box, Grid } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import { makeStyles } from "@material-ui/core/styles";

const columns = [
  { field: "id", hide: true },
  {
    field: "name",
    headerName: "Domain Name",
    headerClassName: "super-app-theme--header",
    width: 350,
  },
  {
    field: "platform",
    headerName: "Platform",
    headerClassName: "super-app-theme--header",
    width: 150,
  },
  {
    field: "status",
    headerName: "Status",
    headerClassName: "super-app-theme--header",
    width: 150,
  },
  {
    field: "auto_renew",
    headerName: "Auto Renews",
    headerClassName: "super-app-theme--header",
    width: 150,
  },
  {
    field: "expires_at",
    headerName: "Expires On",
    headerClassName: "super-app-theme--header",
    width: 200,
  },
  {
    field: "privacy",
    headerName: "Privacy",
    headerClassName: "super-app-theme--header",
    width: 150,
  },
];

// https://material-ui.com/components/data-grid/rendering/
const useStyles = makeStyles({
  root: {
    "& .MuiDataGrid-columnsContainer": {
      backgroundColor: "#D3D3D3",
    },
  },
});

export default function CustomizedTables() {
  const classes = useStyles();

  const [, setErrors] = useState(false); // 0: hasError
  const [rows, setRecords] = useState([]);

  async function loadData() {
    fetch("http://localhost:30000/v1/domains")
      .then(async (result) => {
        if (result.ok) {
          const hits = await result.json();
          setRecords(
            hits.map((hit) => {
              let status = hit.status.join(",");
              if (status === "") {
                status = "-";
              }
              return {
                id: hit._href,
                name: hit.name,
                platform: hit.platform.name,
                status: status,
                auto_renew: hit.auto_renew || "-",
                expires_at: hit.expires_at || "-",
                privacy: hit.privacy || "-",
              };
            }),
          );
        }
      })
      .catch((error) => setErrors(error));
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <Box m={3} />
      <Grid container justify="center">
        <div style={{ height: 800, width: 1200 }} className={classes.root}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            checkboxSelection
          />
        </div>
      </Grid>
    </div>
  );
}
