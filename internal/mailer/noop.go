package mailer

type NoopClient struct{}

func NewNoopClient() NoopClient {
	return NoopClient{}
}

func (NoopClient) Send(templateFile, username, email string, data any, isSandbox bool) (int, error) {
	return 200, nil
}
