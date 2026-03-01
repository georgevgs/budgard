import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

type FormSubmitButtonProps = {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  disabled?: boolean;
};

const FormSubmitButton = ({
  children,
  pendingText,
  className,
  disabled,
}: FormSubmitButtonProps) => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingText : children}
    </Button>
  );
};

export default FormSubmitButton;
