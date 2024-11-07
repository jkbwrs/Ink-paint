export const actions = {
    discord: async ({ request }) => {
        const formData = await request.formData();
        const imageString = formData.get('image') as string;
        
        // Just log the received image for now
        console.log('Received image from client:', imageString.substring(0, 100) + '...');
        
        return {
            success: true,
            message: 'Image received and logged'
        };
    }
}