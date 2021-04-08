import unittest
from unittest.mock import patch, PropertyMock, MagicMock
from os import path
from src import im
from io import BytesIO

THUMB_LENGTH = str(290)

IMAGE_PNG = 'kosys.png'

def with_image(name, consumer):
    p = path.dirname(__file__) + '/fixture/images/' + name
    with open(p, 'rb') as f:
        image = BytesIO(f.read())
        consumer((image, name))

class ImageMagickTestCase(unittest.TestCase):
    def setUp(self):
        self.app = im.app.test_client()

    def tearDown(self):
        None

    def test_ping(self):
        response = self.app.get('/ping')
        self.assertEqual(response.data, b'pong')

    def test_resize_with_valid_params(self):
        def action(image):
            params = dict(width=THUMB_LENGTH, height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 200)

        with_image(IMAGE_PNG, action)

    def test_resize_without_width(self):
        def action(image):
            params = dict(height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image(IMAGE_PNG, action)

    def test_resize_without_height(self):
        def action(image):
            params = dict(width=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image(IMAGE_PNG, action)

    def test_resize_without_data(self):
        params = dict(width=THUMB_LENGTH, height=THUMB_LENGTH)
        response = self.request_resize(params)
        self.assertEqual(response.status_code, 400)

    def test_resize_with_too_large_width(self):
        def action(image):
            params = dict(width=str(im.MAX_THUMB_LENGTH + 1), height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image(IMAGE_PNG, action)

    def test_resize_with_too_large_height(self):
        def action(image):
            params = dict(width=THUMB_LENGTH, height=str(im.MAX_THUMB_LENGTH + 1), data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image(IMAGE_PNG, action)

    def test_resize_with_unsupported_format(self):
        def action(image):
            params = dict(width=THUMB_LENGTH, height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image('favicon.ico', action)

    def test_resize_with_invalid_format(self):
        def action(image):
            params = dict(width=THUMB_LENGTH, height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image('invalid.md', action)

    def test_attempt_command_injection_with_width(self):
        def action(image):
            params = dict(width="|| rm -Rf /", height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image(IMAGE_PNG, action)

    def test_attempt_command_injection_with_height(self):
        def action(image):
            params = dict(width=THUMB_LENGTH, height="|| rm -Rf /", data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 400)

        with_image(IMAGE_PNG, action)

    @patch('subprocess.Popen')
    def test_error_occurred_on_command_execution(self, popen):
        def action(image):
            params = dict(width=THUMB_LENGTH, height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 500)

        popen.side_effect = OSError()
        with_image(IMAGE_PNG, action)

    @patch('subprocess.Popen.wait')
    def test_command_result_non_0_code(self, wait):
        def action(image):
            params = dict(width=THUMB_LENGTH, height=THUMB_LENGTH, data=image)
            response = self.request_resize(params)
            self.assertEqual(response.status_code, 500)

        wait.return_value = 1
        with_image(IMAGE_PNG, action)

    def request_resize(self, params):
        return self.app.post('/resize',
            content_type='multipart/form-data',
            data=params
        )

if __name__ == '__main__':
    unittest.main()
