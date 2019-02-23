
# Quick Object detection app based on Tensorflow

## Example web apps

### Build the image:

```
cd <this-directory>
docker build -t <tagname> -f Dockerfile .
```

### Run the app

```
docker run -it --rm --name <name-of-the-container> -p 5000:5000 <tagname>
```

Point your browser to:
-  `https://localhost:5000/detect` - shows a mirrored video from the attached camera and starts object detection

## Browser support

Almost all browsers, include ones for Mobile platforms.
