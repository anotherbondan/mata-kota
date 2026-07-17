"""Compile Python sources in memory as the service's build validation."""

from pathlib import Path

SOURCE_DIRECTORIES = (Path("app"), Path("strsp"))


def main() -> None:
    source_files = sorted(
        path
        for directory in SOURCE_DIRECTORIES
        for path in directory.rglob("*.py")
    )
    for source_file in source_files:
        source = source_file.read_text(encoding="utf-8")
        compile(source, str(source_file), "exec")

    print(f"Validated {len(source_files)} Python source files.")


if __name__ == "__main__":
    main()
