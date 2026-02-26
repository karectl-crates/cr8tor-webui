import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";

const ArrayFieldTemplate = ({
  items,
  canAdd,
  onAddClick,
  title,
  description,
  uiSchema
}) => (
  <Box sx={{ mt: 2, background: "#f30a22" }}>
    {title && (
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
    )}
    {description}
    <Box>
      {items &&
        items.map((element, idx) => (
          <Box display="flex" justifyContent="center" sx={{ pl: 4, background: "#f30a22" }}>
            <Card
              key={element.key}
              sx={{
                mb: 2,
                boxShadow: 2,
                borderRadius: 2,
                background: "#f30a22",
                width: '100%',
                maxWidth: 1100,
                p: 3
              }}
            >
              <CardContent sx={{ p: 3, pl: 5 }}>
                <Box display="flex" alignItems="center">
                  <Box flexGrow={1}>{element.children}</Box>
                  {element.hasRemove && (
                    <IconButton
                      aria-label="Remove"
                      onClick={element.onDropIndexClick(element.index)}
                      color="error"
                      sx={{ ml: 2 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      {canAdd && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCircleIcon />}
          onClick={onAddClick}
          sx={{ mt: 1 }}
        >
          Add
        </Button>
      )}
    </Box>
  </Box>
);

export default ArrayFieldTemplate;
