import { useState, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Cropper from "react-easy-crop"
import { getCroppedImg } from "@/lib/cropImage"
import { Loader2, UploadCloud, ImagePlus } from "lucide-react"

interface ImageCropDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    currentImageUrl?: string
    onCropSuccess: (croppedBlob: Blob) => void
}

export function ImageCropDialog({ isOpen, onOpenChange, currentImageUrl, onCropSuccess }: ImageCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [isCropping, setIsCropping] = useState(false)
    const [selectedImageSrc, setSelectedImageSrc] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (selectedImageSrc) URL.revokeObjectURL(selectedImageSrc)
        const imageUrl = URL.createObjectURL(file)
        setSelectedImageSrc(imageUrl)

        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleCrop = async () => {
        if (!croppedAreaPixels || !selectedImageSrc) return

        setIsCropping(true)
        try {
            const croppedImageBlob = await getCroppedImg(selectedImageSrc, croppedAreaPixels)
            onCropSuccess(croppedImageBlob)
            handleClose()
        } catch (e) {
            console.error("Failed to crop image:", e)
        } finally {
            setIsCropping(false)
        }
    }

    const handleClose = () => {
        if (selectedImageSrc) URL.revokeObjectURL(selectedImageSrc)
        setSelectedImageSrc("")
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setCroppedAreaPixels(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else onOpenChange(true); }}>
            <DialogContent className="sm:max-w-[450px] z-200">
                <DialogHeader>
                    <DialogTitle>Update Profile Picture</DialogTitle>
                </DialogHeader>

                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />

                {selectedImageSrc ? (
                    <>
                        <div className="relative h-[300px] w-full mt-2 bg-black rounded-xl overflow-hidden">
                            <Cropper
                                image={selectedImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">Scroll to zoom</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-indigo-600 hover:text-indigo-700"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Choose different image
                            </Button>
                        </div>
                    </>
                ) : (
                    <div
                        className="mt-2 flex flex-col items-center justify-center gap-3 h-[300px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {currentImageUrl ? (
                            <img src={currentImageUrl} alt="Current" className="h-20 w-20 rounded-full object-cover border-2 border-slate-200" />
                        ) : (
                            <ImagePlus className="h-12 w-12 text-slate-300" />
                        )}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-bold text-slate-600">Click to select an image</span>
                            <span className="text-xs text-slate-400">JPG, PNG or WebP supported</span>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-1 text-xs">
                            <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                            Browse Files
                        </Button>
                    </div>
                )}

                <DialogFooter className="mt-2">
                    <Button variant="ghost" onClick={handleClose} disabled={isCropping}>Cancel</Button>
                    <Button
                        onClick={handleCrop}
                        disabled={isCropping || !selectedImageSrc}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                        {isCropping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Crop & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
