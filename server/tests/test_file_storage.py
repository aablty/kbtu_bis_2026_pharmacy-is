from src.core.file_storage import parse_cloudinary_url


def test_parse_cloudinary_url_extracts_credentials() -> None:
    credentials = parse_cloudinary_url("cloudinary://mykey:mysecret@mycloud")
    assert credentials.cloud_name == "mycloud"
    assert credentials.api_key == "mykey"
    assert credentials.api_secret == "mysecret"
