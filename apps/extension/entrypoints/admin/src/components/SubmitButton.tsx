import { Button, Form, FormInstance } from "antd";
import React from "react";

interface SubmitButtonProps {
  form?: FormInstance;
  loading?: boolean;
  children?: any;
}

const SubmitButton: React.FC<React.PropsWithChildren<SubmitButtonProps>> = ({
  form,
  children,
  loading,
}) => {
  //TODO button disable when form field invalid
  return (
    <Button loading={loading} type="primary" htmlType="submit">
      {children}
    </Button>
  );
};

export default SubmitButton;
