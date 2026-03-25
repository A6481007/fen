import Container from "@/components/Container";
import LoadingState from "@/components/shared/LoadingState";

const Loading = () => (
  <div className="min-h-screen bg-surface-0">
    <Container className="py-12">
      <LoadingState message="Loading article..." />
    </Container>
  </div>
);

export default Loading;
