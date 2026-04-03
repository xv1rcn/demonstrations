import argparse

from app import create_app


app = create_app()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", action="store_true", help="Enable Flask debug mode")
    args = parser.parse_args()

    debug_mode = args.debug
    app.run(debug=debug_mode)
