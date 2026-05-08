import { useState } from 'react';

export default function useForm(initialValues = {}, validate = () => ({})) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validate(values) || {};
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
  };

  const submit = async (onValid) => {
    const fieldErrors = validate(values) || {};
    setErrors(fieldErrors);
    const allTouched = Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    const hasErrors = Object.keys(fieldErrors).some(k => fieldErrors[k]);
    if (!hasErrors) {
      await onValid(values);
      return true;
    }
    return false;
  };

  return { values, errors, touched, handleChange, handleBlur, submit, setValues, setErrors };
}
